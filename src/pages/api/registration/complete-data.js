export const prerender = false;

import { supabaseAdmin } from "../../../lib/supabase";
import { 
  getClientIP, 
  checkIPRateLimit, 
  checkPhoneRateLimit,
  rateLimitResponse 
} from "../../../lib/rateLimit";
import { 
  validateNIK, 
  validatePhone, 
  validateRequired,
  sanitizeText 
} from "../../../lib/validation";

export async function POST({ request }) {
  try {
    const clientIP = getClientIP(request);
    const ipLimit = checkIPRateLimit(clientIP, { maxAttempts: 20 });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.error);
    
    const formData = await request.formData();
    
    const getVal = (key) => {
        const val = formData.get(key);
        if (val === 'null' || val === 'undefined' || val === '' || val === null) return null;
        return sanitizeText(val.toString());
    };

    const registration_number = getVal('registration_form_number');
    if (!registration_number) {
        return new Response(JSON.stringify({ error: "Nomor Registrasi tidak ditemukan" }), { status: 400 });
    }

    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketName = 'ppdb-documents';
    if (!buckets || !buckets.find(b => b.name === bucketName)) {
        await supabaseAdmin.storage.createBucket(bucketName, { public: true });
    }

    const uploadedFiles = {};
    const fileKeys = ['fileFoto', 'fileKK', 'fileAkta', 'fileRapor'];
    
    for (const key of fileKeys) {
        const file = formData.get(key);
        if (file && typeof file === 'object' && file.name) {
            try {
                const fileExt = file.name.split('.').pop();
                const safeName = `${key}_${Date.now()}.${fileExt}`;
                const filePath = `ppdb/${registration_number}/${safeName}`;

                const { error: uploadError } = await supabaseAdmin
                    .storage
                    .from('ppdb-documents')
                    .upload(filePath, file, { contentType: file.type || 'application/octet-stream', upsert: true });

                if (!uploadError) {
                    const { data: { publicUrl } } = supabaseAdmin
                        .storage
                        .from('ppdb-documents')
                        .getPublicUrl(filePath);
                    uploadedFiles[key] = publicUrl;
                }
            } catch (e) {}
        }
    }

    const tanggalLahir = getVal('tanggalLahir');
    const finalDob = tanggalLahir ? new Date(tanggalLahir).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    // UPDATE registrations
    const { data: regData, error: regError } = await supabaseAdmin
      .from("registrations")
      .update({
          date_of_birth: finalDob,
          gender: getVal('jenisKelamin'),
          status: "document_complete"
      })
      .eq("registration_number", registration_number)
      .select()
      .single();

    if (regError || !regData) {
       return new Response(JSON.stringify({ error: "Data pendaftaran tidak ditemukan." }), { status: 404 });
    }

    const isDomisiliBerbeda = getVal('isDomisiliBerbeda') === 'true';
    const alamatKK = getVal('alamatKK');

    // INSERT to students
    const studentDataPayload = {
      full_name: regData.student_full_name,
      nickname: getVal('namaPanggilan'),
      nik: getVal('nik'),
      nisn: getVal('nisn'),
      place_of_birth: getVal('tempatLahir'),
      date_of_birth: finalDob,
      gender: getVal('jenisKelamin'),
      registration_type: regData.track,
      address_kk: alamatKK,
      is_domicile_different: isDomisiliBerbeda,
      address_domicile: isDomisiliBerbeda ? getVal('alamatDomisili') : alamatKK,
      nationality: getVal('kewarganegaraan'),
      child_order: getVal('anakKe') ? parseInt(getVal('anakKe')) : null,
      siblings_count: getVal('jumlahSaudara') ? parseInt(getVal('jumlahSaudara')) : null,
      registration_id: registration_number,
      status: "registered",
      created_at: new Date().toISOString(),
      profile_photo_url: uploadedFiles['fileFoto'] || null,
      document_urls: uploadedFiles
    };

    let studentRes = await supabaseAdmin.from("students").insert(studentDataPayload).select().single();
    if (studentRes.error && studentRes.error.code === '42703') {
        const { document_urls, ...safePayload } = studentDataPayload;
        studentRes = await supabaseAdmin.from("students").insert(safePayload).select().single();
    }
    
    if (studentRes.error) {
       // rollback not strictly needed since we can just try again, but let's leave it
       return new Response(JSON.stringify({ error: "Gagal membuat data siswa: " + studentRes.error.message }), { status: 500 });
    }

    const studentId = studentRes.data.id;

    // INSERT background
    await supabaseAdmin.from("student_backgrounds").insert({
      student_id: studentId,
      school_experience: getVal('asalSekolah'),
      origin_school_name: getVal('namaSekolahAsal'),
      origin_school_address: getVal('alamatSekolahAsal'),
      reading_skill: getVal('reading_skill') || getVal('kemampuanMembaca'),
      writing_skill: getVal('kemampuanMenulis'),
      counting_skill: getVal('kemampuanBerhitung'),
      motoric_development: getVal('perkembanganMotorik'),
      language_development: getVal('perkembanganBahasa'),
      social_development: getVal('perkembanganSosial'),
      independence_level: getVal('kemandirian'),
      toilet_training_status: getVal('kemandirianToilet'),
      sleep_habits: getVal('kebiasaanTidur'),
      eating_habits: getVal('kebiasaanMakan'),
      height_cm: getVal('tinggiBadan') ? parseFloat(getVal('tinggiBadan')) : null,
      weight_kg: getVal('beratBadan') ? parseFloat(getVal('beratBadan')) : null,
      head_circumference_cm: getVal('lingkarKepala') ? parseFloat(getVal('lingkarKepala')) : null,
      arm_circumference_cm: getVal('lingkarLenganAtas') ? parseFloat(getVal('lingkarLenganAtas')) : null,
      blood_type: getVal('golonganDarah'),
      immunization_status: getVal('imunisasi'),
      disease_history: getVal('riwayatPenyakit'),
      hospitalization_history: getVal('riwayatRawatInap'),
      allergies: getVal('alergi'),
      specific_physical_conditions: getVal('kondisiFisikKhusus'),
      birth_process: getVal('prosesKelahiran'),
      infant_feeding: getVal('asupanBayi'),
      formula_brand: getVal('merekSusu'),
      crawling_process: getVal('prosesMerangkak'),
      learning_style: getVal('gayaBelajar'),
      special_talents: getVal('minatBakat'),
      bullying_history: getVal('riwayatBullying'),
      distance_to_school_m: getVal('jarakKeSekolah') ? parseInt(getVal('jarakKeSekolah')) : null,
      transportation_mode: getVal('modaTransportasi'),
      gadget_duration_per_day: getVal('durasiGadget'),
      gadget_rules: getVal('aturanGadget'),
      gadget_owner: getVal('kontenGadget'), 
      family_notes: `Konten Gadget: ${getVal('kontenGadget') || '-'}`,
      motivation_to_join: getVal('motivasiMasuk'),
    });

    const guardiansPayload = [];
    const statusAyah = getVal('statusAyah');
    if (getVal('namaAyah')) {
      guardiansPayload.push({
        student_id: studentId,
        relation_type: 'AYAH',
        full_name: getVal('namaAyah'),
        nik: statusAyah === 'Hidup' ? getVal('nikAyah') : null,
        phone_number: statusAyah === 'Hidup' ? getVal('noHpAyah') : null,
        education: getVal('pendidikanAyah'),
        occupation: getVal('pekerjaanAyah'),
        income_range: getVal('penghasilanAyah'),
        address: getVal('namaKantorAyah'), 
        is_deceased: statusAyah === 'Meninggal'
      });
    }

    const statusIbu = getVal('statusIbu');
    if (getVal('namaIbu')) {
      guardiansPayload.push({
        student_id: studentId,
        relation_type: 'IBU',
        full_name: getVal('namaIbu'),
        nik: statusIbu === 'Hidup' ? getVal('nikIbu') : null,
        phone_number: statusIbu === 'Hidup' ? getVal('noHpIbu') : null,
        education: getVal('pendidikanIbu'),
        occupation: getVal('pekerjaanIbu'),
        income_range: getVal('penghasilanIbu'),
        address: getVal('namaKantorIbu'),
        is_deceased: statusIbu === 'Meninggal'
      });
    }

    if (getVal('adaWali') === 'true' && getVal('namaWali')) {
      guardiansPayload.push({
        student_id: studentId,
        relation_type: 'WALI', 
        full_name: getVal('namaWali'),
        occupation: `${getVal('hubunganWali')} - ${getVal('pekerjaanWali')}`,
        phone_number: getVal('noHpWali'),
      });
    }

    if (guardiansPayload.length > 0) {
      await supabaseAdmin.from("student_guardians").insert(guardiansPayload);
    }

    await supabaseAdmin.from("activity_logs").insert({
      action: "COMPLETE_DATA_SPMB",
      entity_type: "registrations",
      entity_id: regData.id,
      details: { registration_number, uploaded_files: Object.keys(uploadedFiles) },
      ip_address: request.headers.get("x-forwarded-for") || "unknown"
    });

    return new Response(JSON.stringify({ 
      success: true, 
      registration_number,
      message: "Data lengkap berhasil tersimpan!"
    }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Terjadi kesalahan server: " + err.message }), { status: 500 });
  }
}
