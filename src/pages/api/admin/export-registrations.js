export const prerender = false;

import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';
import * as XLSX from 'xlsx';

// ─── CONSTANTS ───────────────────────────────────────────
const SUPABASE_PAGE_SIZE = 500;   // Rows per Supabase query
const IN_CLAUSE_CHUNK = 150;      // Max items per .in() to avoid URL limit
const EXPORT_TIMEOUT_MS = 25000;  // 25s hard timeout (Vercel free = 10s, Pro = 60s)

// ─── HELPERS ─────────────────────────────────────────────

/** Split array into chunks of `size` */
function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Safely coerce any value to string for spreadsheet cell */
function safeStr(val) {
  if (val === null || val === undefined) return '';
  return String(val);
}

/** Fetch ALL rows from a table with pagination (bypasses Supabase 1000 row default limit) */
async function fetchAllRows(table, selectCols, filters = {}) {
  const allRows = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabaseAdmin
      .from(table)
      .select(selectCols)
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (key === '_in') {
        // Special: { _in: { column: 'col', values: [...] } }
        // Handled separately via chunked queries
        continue;
      }
      if (key === '_order') {
        query = query.order(value.column, { ascending: value.ascending });
        continue;
      }
      query = query.eq(key, value);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`[Export] fetchAllRows(${table}) error at offset ${from}:`, error.message);
      break; // Return what we have so far
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allRows.push(...data);
      if (data.length < SUPABASE_PAGE_SIZE) {
        hasMore = false;
      } else {
        from += SUPABASE_PAGE_SIZE;
      }
    }
  }

  return allRows;
}

/** Fetch rows using chunked .in() filter (avoids PostgREST URL length limit) */
async function fetchByIds(table, selectCols, idColumn, ids) {
  if (!ids || ids.length === 0) return [];

  const idChunks = chunk(ids, IN_CLAUSE_CHUNK);
  const allRows = [];

  for (const idBatch of idChunks) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(selectCols)
      .in(idColumn, idBatch);

    if (error) {
      console.error(`[Export] fetchByIds(${table}) chunk error:`, error.message);
      // Continue with next chunk — partial data is better than no data
      continue;
    }

    if (data) {
      allRows.push(...data);
    }
  }

  return allRows;
}

/** Build a filename with today's date */
function buildFilename(ext) {
  const date = new Date().toISOString().split('T')[0];
  return `data-spmb-${date}.${ext}`;
}

/** Create an error response as downloadable file (so window.open doesn't show blank page) */
function errorResponse(message, statusCode = 500) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Export-Error': 'true'
      }
    }
  );
}

/** Build the final spreadsheet Response (CSV or XLSX) */
function buildFileResponse(rows, format) {
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns based on header length
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(key.length + 2, 12)
  }));
  worksheet['!cols'] = colWidths;

  if (format === 'csv') {
    const csv = '\uFEFF' + XLSX.utils.sheet_to_csv(worksheet);
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${buildFilename('csv')}"`,
        'X-Export-Error': 'false'
      }
    });
  }

  // XLSX
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data SPMB');

  // Use 'buffer' type → returns Node.js Buffer, wrap in Uint8Array for Response
  const xlsxOutput = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new Response(new Uint8Array(xlsxOutput), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${buildFilename('xlsx')}"`,
      'X-Export-Error': 'false'
    }
  });
}

// ─── MAIN HANDLER ────────────────────────────────────────

export async function GET({ request }) {
  // Auth check
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  // Timeout wrapper
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXPORT_TIMEOUT_MS);

  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'xlsx';
    const statusFilter = url.searchParams.get('status');

    // ─── STEP 1: Fetch registrations (paginated) ───────
    let regQuery = supabaseAdmin
      .from('registrations')
      .select(`
        id, registration_number, student_full_name, date_of_birth, gender,
        parent_name, parent_phone, parent_email, status, track, created_at,
        verified_at, test_date, test_score, verification_notes
      `)
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      regQuery = regQuery.eq('status', statusFilter);
    }

    // Paginated fetch
    const registrations = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await regQuery.range(from, from + SUPABASE_PAGE_SIZE - 1);

      if (error) {
        console.error('[Export] Registrations query error:', error.message);
        return errorResponse('Gagal mengambil data registrasi: ' + error.message);
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        registrations.push(...data);
        hasMore = data.length >= SUPABASE_PAGE_SIZE;
        from += SUPABASE_PAGE_SIZE;
      }
    }

    // Empty dataset → return file with header row only
    if (registrations.length === 0) {
      const emptyRow = [{
        'No. Registrasi': '',
        'Nama Siswa': '',
        'Jenis Jalur': '',
        'Status': '',
        'Info': 'Tidak ada data pendaftar'
      }];
      return buildFileResponse(emptyRow, format);
    }

    // ─── STEP 2: Fetch students (chunked by registration_number) ───
    const regNumbers = registrations
      .map(r => r.registration_number)
      .filter(Boolean);

    const students = await fetchByIds(
      'students',
      'id, registration_id, address_kk, address_domicile, nationality, child_order, siblings_count, registration_type',
      'registration_id',
      regNumbers
    );

    // Build lookup: registration_number → student
    const studentMap = {};
    students.forEach(s => {
      studentMap[s.registration_id] = s;
    });

    // ─── STEP 3: Fetch guardians + backgrounds (chunked by student_id) ───
    const studentIds = students.map(s => s.id).filter(Boolean);

    let guardians = [];
    let backgrounds = [];

    if (studentIds.length > 0) {
      // Run both in parallel
      const [guardResult, bgResult] = await Promise.allSettled([
        fetchByIds(
          'student_guardians',
          'student_id, relation_type, full_name, phone_number, education, occupation, income_range',
          'student_id',
          studentIds
        ),
        fetchByIds(
          'student_backgrounds',
          'student_id, school_experience, origin_school_name, height_cm, weight_kg, blood_type, immunization_status, disease_history, allergies',
          'student_id',
          studentIds
        )
      ]);

      // Use results even if one fails (graceful degradation)
      if (guardResult.status === 'fulfilled') {
        guardians = guardResult.value;
      } else {
        console.error('[Export] Guardians fetch failed:', guardResult.reason);
      }

      if (bgResult.status === 'fulfilled') {
        backgrounds = bgResult.value;
      } else {
        console.error('[Export] Backgrounds fetch failed:', bgResult.reason);
      }
    }

    // Build lookups
    const guardianMap = {};
    guardians.forEach(g => {
      if (!guardianMap[g.student_id]) guardianMap[g.student_id] = [];
      guardianMap[g.student_id].push(g);
    });

    const bgMap = {};
    backgrounds.forEach(b => {
      bgMap[b.student_id] = b;
    });

    // ─── STEP 4: Flatten data into export rows ───────
    const statusLabels = {
      pending: 'Menunggu',
      verified: 'Terverifikasi',
      document_complete: 'Dokumen Lengkap',
      scheduled: 'Dijadwalkan',
      lulus: 'Lulus',
      tidak_lulus: 'Tidak Lulus',
      enrolled: 'Daftar Ulang',
      rejected: 'Ditolak'
    };

    const rows = registrations.map((r, index) => {
      const student = studentMap[r.registration_number] || {};
      const stuGuardians = guardianMap[student.id] || [];
      const ayah = stuGuardians.find(g => g.relation_type === 'AYAH') || {};
      const ibu = stuGuardians.find(g => g.relation_type === 'IBU') || {};
      const bg = bgMap[student.id] || {};

      return {
        'No': index + 1,
        'No. Registrasi': safeStr(r.registration_number),
        'Nama Siswa': safeStr(r.student_full_name),
        'Jenis Jalur': r.track === 'murid_baru' ? 'Murid Baru' : r.track === 'mutasi' ? 'Mutasi/Pindahan' : safeStr(r.track),
        'Tanggal Lahir': safeStr(r.date_of_birth),
        'L/P': r.gender === 'L' ? 'Laki-laki' : r.gender === 'P' ? 'Perempuan' : '',
        'Alamat KK': safeStr(student.address_kk),
        'Alamat Domisili': safeStr(student.address_domicile),
        'Anak Ke': safeStr(student.child_order),
        'Jumlah Saudara': safeStr(student.siblings_count),

        // Ayah
        'Nama Ayah': safeStr(ayah.full_name),
        'HP Ayah': safeStr(ayah.phone_number),
        'Pendidikan Ayah': safeStr(ayah.education),
        'Pekerjaan Ayah': safeStr(ayah.occupation),
        'Penghasilan Ayah': safeStr(ayah.income_range),

        // Ibu
        'Nama Ibu': safeStr(ibu.full_name),
        'HP Ibu': safeStr(ibu.phone_number),
        'Pendidikan Ibu': safeStr(ibu.education),
        'Pekerjaan Ibu': safeStr(ibu.occupation),
        'Penghasilan Ibu': safeStr(ibu.income_range),

        // Kontak Utama
        'No. HP Ortu': safeStr(r.parent_phone),
        'Email Ortu': safeStr(r.parent_email),

        // Riwayat Pendidikan
        'Asal Sekolah': safeStr(bg.school_experience),
        'Nama Sekolah': safeStr(bg.origin_school_name),

        // Kesehatan
        'Tinggi (cm)': safeStr(bg.height_cm),
        'Berat (kg)': safeStr(bg.weight_kg),
        'Golongan Darah': safeStr(bg.blood_type),
        'Imunisasi': safeStr(bg.immunization_status),
        'Riwayat Penyakit': safeStr(bg.disease_history),
        'Alergi': safeStr(bg.allergies),

        // Status
        'Status': statusLabels[r.status] || safeStr(r.status),
        'Tanggal Daftar': r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : '',
        'Tanggal Verifikasi': r.verified_at ? new Date(r.verified_at).toLocaleDateString('id-ID') : '',
        'Tanggal Tes': safeStr(r.test_date),
        'Nilai Tes': r.test_score != null ? safeStr(r.test_score) : '',
        'Catatan': safeStr(r.verification_notes)
      };
    });

    // ─── STEP 5: Build and return file ───────
    return buildFileResponse(rows, format);

  } catch (err) {
    // Distinguish timeout from other errors
    if (err.name === 'AbortError') {
      console.error('[Export] Timeout exceeded');
      return errorResponse('Export timeout — terlalu banyak data. Coba filter berdasarkan status terlebih dahulu.', 504);
    }

    console.error('[Export] Unexpected error:', err);
    return errorResponse('Gagal mengekspor data: ' + (err.message || 'Unknown error'));
  } finally {
    clearTimeout(timeout);
  }
}