
export const prerender = false; // Ensure this is server-side rendered

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
import { 
  sendNotification, 
  generateRegistrationConfirmation 
} from "../../../lib/notification";

export async function POST({ request }) {
  try {
    // ============================================
    // STEP 0: Rate Limiting Check
    // ============================================
    const clientIP = getClientIP(request);
    
    // Check IP-based rate limit (20 requests/hour)
    const ipLimit = checkIPRateLimit(clientIP, { maxAttempts: 20 });
    if (!ipLimit.allowed) {
      console.log(`⏱️ IP Rate limit hit: ${clientIP}`);
      return rateLimitResponse(ipLimit.error);
    }
    
    const formData = await request.formData();
    
    // Helper to get string or null safely
    const getVal = (key) => {
        const val = formData.get(key);
        if (val === 'null' || val === 'undefined' || val === '' || val === null) return null;
        return sanitizeText(val.toString());
    };

    // Step 1: Basic Data Extraction for Validation
    const namaLengkap = getVal('namaLengkap');
    const namaAyah = getVal('namaAyah');
    const namaIbu = getVal('namaIbu');
    const primaryPhone = getVal('noHpAyah') || getVal('noHpIbu') || getVal('noHpWali');

    // ============================================
    // Phone-based Rate Limiting (more restrictive)
    // ============================================
    if (primaryPhone) {
      const phoneLimit = checkPhoneRateLimit(primaryPhone, { maxAttempts: 3 });
      if (!phoneLimit.allowed) {
        console.log(`⏱️ Phone Rate limit hit: ${primaryPhone}`);
        return rateLimitResponse(phoneLimit.error);
      }
    }

    // ============================================
    // Enhanced Validation
    // ============================================
    const validationErrors = [];

    // Nama Lengkap
    const namaValidation = validateRequired(namaLengkap, 'Nama Lengkap', 3);
    if (!namaValidation.valid) validationErrors.push(namaValidation.error);

    // Nama Orang Tua
    if (!namaAyah && !namaIbu) {
      validationErrors.push('Minimal salah satu nama orang tua (Ayah/Ibu) harus diisi');
    }

    // NIK Validation (if provided)
    const nik = getVal('nik');
    if (nik) {
      const nikValidation = validateNIK(nik, true);
      if (!nikValidation.valid) validationErrors.push(`NIK: ${nikValidation.error}`);
    }

    // Phone Validation
    if (primaryPhone) {
      const phoneValidation = validatePhone(primaryPhone, true);
      if (!phoneValidation.valid) validationErrors.push(`No. HP: ${phoneValidation.error}`);
    }

    // Return all validation errors at once
    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({ 
        error: "Validasi gagal", 
        errors: validationErrors 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }


    // Step 2: Generate Registration Number
    const registration_form_number = getVal('registration_form_number');
    let registration_number;
    if (registration_form_number && registration_form_number.trim() !== "") {
      registration_number = registration_form_number.trim();
    } else {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const crypto = await import('node:crypto');
      const randomBytes = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
      registration_number = `REG-${dateStr}-${randomBytes}`;
    }

    console.log("📝 SPMB Registration Process:", registration_number, namaLengkap);

    // Step 2b: Ensure Storage Bucket Exists
    try {
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const bucketName = 'ppdb-documents';
        if (!buckets || !buckets.find(b => b.name === bucketName)) {
            console.log(`Creating storage bucket: ${bucketName}`);
            await supabaseAdmin.storage.createBucket(bucketName, {
                public: true,
                fileSizeLimit: 5242880, // 5MB
                allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf']
            });
        }
    } catch (bucketErr) {
        console.warn("⚠️ Bucket check/create failed (might already exist or permission issue):", bucketErr.message);
    }

    // Step 3: Handle File Uploads
    const uploadedFiles = {};
    const fileKeys = ['fileFoto', 'fileKK', 'fileAkta', 'fileRapor'];
    
    for (const key of fileKeys) {
        const file = formData.get(key);
        // Check if it's a File object (has name, size, type)
        // In Astro/Node, formData.get() returns a File object if uploaded
        if (file && typeof file === 'object' && file.name) {
            try {
                // Generate safe filename
                const fileExt = file.name.split('.').pop();
                const safeName = `${key}_${Date.now()}.${fileExt}`;
                const filePath = `ppdb/${registration_number}/${safeName}`;

                // Upload
                // Need to convert File to ArrayBuffer for supabase-js in some environments, 
                // but supabase-js v2 usually handles File objects from FormData.
                const { error: uploadError } = await supabaseAdmin
                    .storage
                    .from('ppdb-documents')
                    .upload(filePath, file, {
                        contentType: file.type || 'application/octet-stream',
                        upsert: true
                    });

                if (uploadError) {
                    console.error(`❌ Upload Error (${key}):`, uploadError.message);
                } else {
                    // Get Public URL
                    const { data: { publicUrl } } = supabaseAdmin
                        .storage
                        .from('ppdb-documents')
                        .getPublicUrl(filePath);
                    
                    uploadedFiles[key] = publicUrl;
                    console.log(`✅ Uploaded ${key}: ${publicUrl}`);
                }
            } catch (uErr) {
                console.error(`❌ Upload Exception (${key}):`, uErr);
            }
        }
    }

    // Step 4: Insert into 'registrations'
    const statusAyah = getVal('statusAyah');
    const statusIbu = getVal('statusIbu');
    const noHpAyah = getVal('noHpAyah');
    const noHpIbu = getVal('noHpIbu');
    const noHpWali = getVal('noHpWali');
    
    let primaryContactName = namaAyah;
    let primaryContactPhone = noHpAyah;
    
    if (statusAyah === 'Hidup') {
        primaryContactName = namaAyah;
        primaryContactPhone = noHpAyah;
    } else if (statusIbu === 'Hidup') {
        primaryContactName = namaIbu;
        primaryContactPhone = noHpIbu;
    } else {
        primaryContactName = getVal('namaWali') || namaAyah || namaIbu;
        primaryContactPhone = noHpWali;
    }
    
    const tanggalLahir = getVal('tanggalLahir');
    const finalDob = tanggalLahir 
      ? new Date(tanggalLahir).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0];

    const registrationData = {
      registration_number,
      student_full_name: namaLengkap,
      parent_name: primaryContactName,
      parent_phone: primaryContactPhone,
      parent_email: `${registration_number.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
      date_of_birth: finalDob,
      gender: getVal('jenisKelamin'),
      track: getVal('jenisPendaftaran') || 'murid_baru',
      status: "pending"
    };

    const { data: regData, error: regError } = await supabaseAdmin
      .from("registrations")
      .insert(registrationData)
      .select()
      .single();

    if (regError) {
       console.error("❌ Registration DB Error:", regError);
       if (regError.code === '23505') {
          return new Response(JSON.stringify({ error: "Nomor registrasi sudah terdaftar." }), { status: 400 });
       }
       return new Response(JSON.stringify({ error: "Gagal membuat registrasi: " + regError.message }), { status: 500 });
    }

    // Step 5: Insert into 'students'
    const isDomisiliBerbeda = getVal('isDomisiliBerbeda') === 'true';
    const alamatKK = getVal('alamatKK');
    const alamatDomisili = getVal('alamatDomisili');

    const studentDataPayload = {
      full_name: namaLengkap,
      nickname: getVal('namaPanggilan'),
      nik: getVal('nik'),
      nisn: getVal('nisn'),
      place_of_birth: getVal('tempatLahir'),
      date_of_birth: finalDob,
      gender: getVal('jenisKelamin'),
      registration_type: getVal('jenisPendaftaran') || 'murid_baru',
      address_kk: alamatKK,
      is_domicile_different: isDomisiliBerbeda,
      address_domicile: isDomisiliBerbeda ? alamatDomisili : alamatKK,
      nationality: getVal('kewarganegaraan'),
      child_order: getVal('anakKe') ? parseInt(getVal('anakKe')) : null,
      siblings_count: getVal('jumlahSaudara') ? parseInt(getVal('jumlahSaudara')) : null,
      registration_id: registration_number,
      status: "registered",
      created_at: new Date().toISOString(),
      
      // Document URLs
      profile_photo_url: uploadedFiles['fileFoto'] || null,
      document_urls: uploadedFiles // JSONB
    };

    let studentRes = await supabaseAdmin
      .from("students")
      .insert(studentDataPayload)
      .select()
      .single();

    // Retry if 'document_urls' column is missing logic
    if (studentRes.error && studentRes.error.code === '42703' && studentRes.error.message.includes('document_urls')) {
        console.warn("⚠️ Column 'document_urls' missing in DB. Retrying insert without it.");
        const { document_urls, ...safePayload } = studentDataPayload;
        studentRes = await supabaseAdmin
          .from("students")
          .insert(safePayload)
          .select()
          .single();
    }

    if (studentRes.error) {
      console.error("❌ Student DB Error:", studentRes.error);
      // Attempt rollback
      await supabaseAdmin.from("registrations").delete().eq("id", regData.id); 
      return new Response(JSON.stringify({ error: "Gagal membuat data siswa: " + studentRes.error.message }), { status: 500 });
    }

    const studentId = studentRes.data.id;

    // Step 6: Insert into 'student_backgrounds'
    const backgroundData = {
      student_id: studentId,
      // Edu
      school_experience: getVal('asalSekolah'),
      origin_school_name: getVal('namaSekolahAsal'),
      origin_school_address: getVal('alamatSekolahAsal'),
      
      // Readiness & Skills
      reading_skill: getVal('reading_skill') || getVal('kemampuanMembaca'),
      writing_skill: getVal('kemampuanMenulis'), // NEW
      counting_skill: getVal('kemampuanBerhitung'),
      
      // Development
      motoric_development: getVal('perkembanganMotorik'), // NEW
      language_development: getVal('perkembanganBahasa'), // Updated
      social_development: getVal('perkembanganSosial'), // NEW
      independence_level: getVal('kemandirian'),
      toilet_training_status: getVal('kemandirianToilet'),
      
      // Habits
      sleep_habits: getVal('kebiasaanTidur'), // NEW
      eating_habits: getVal('kebiasaanMakan'), // NEW
      
      // Health
      height_cm: getVal('tinggiBadan') ? parseFloat(getVal('tinggiBadan')) : null,
      weight_kg: getVal('beratBadan') ? parseFloat(getVal('beratBadan')) : null,
      head_circumference_cm: getVal('lingkarKepala') ? parseFloat(getVal('lingkarKepala')) : null,
      arm_circumference_cm: getVal('lingkarLenganAtas') ? parseFloat(getVal('lingkarLenganAtas')) : null, // NEW
      blood_type: getVal('golonganDarah'),
      immunization_status: getVal('imunisasi'),
      disease_history: getVal('riwayatPenyakit'),
      hospitalization_history: getVal('riwayatRawatInap'), // NEW
      allergies: getVal('alergi'),
      specific_physical_conditions: getVal('kondisiFisikKhusus'), // NEW
      
      // Birth History (NEW)
      birth_process: getVal('prosesKelahiran'),
      infant_feeding: getVal('asupanBayi'),
      formula_brand: getVal('merekSusu'),
      crawling_process: getVal('prosesMerangkak'),
      
      // Psycho
      learning_style: getVal('gayaBelajar'),
      special_talents: getVal('minatBakat'),
      bullying_history: getVal('riwayatBullying'), // NEW
      
      // Survey/Env
      distance_to_school_m: getVal('jarakKeSekolah') ? parseInt(getVal('jarakKeSekolah')) : null,
      transportation_mode: getVal('modaTransportasi'),
      gadget_duration_per_day: getVal('durasiGadget'),
      gadget_rules: getVal('aturanGadget'),
      gadget_owner: getVal('kontenGadget'), 
      family_notes: `Konten Gadget: ${getVal('kontenGadget') || '-'}`,
      motivation_to_join: getVal('motivasiMasuk'),
    };

    const { error: bgError } = await supabaseAdmin
      .from("student_backgrounds")
      .insert(backgroundData);
    
    if (bgError) console.error("⚠️ Background Insert Error:", bgError);

    // Step 7: Insert into 'student_guardians'
    const guardiansPayload = [];
    
    // Ayah
    if (namaAyah) {
      guardiansPayload.push({
        student_id: studentId,
        relation_type: 'AYAH',
        full_name: namaAyah,
        nik: statusAyah === 'Hidup' ? getVal('nikAyah') : null,
        phone_number: statusAyah === 'Hidup' ? noHpAyah : null,
        education: getVal('pendidikanAyah'),
        occupation: getVal('pekerjaanAyah'),
        income_range: getVal('penghasilanAyah'),
        address: getVal('namaKantorAyah'), 
        is_deceased: statusAyah === 'Meninggal'
      });
    }

    if (namaIbu) {
      guardiansPayload.push({
        student_id: studentId,
        relation_type: 'IBU',
        full_name: namaIbu,
        nik: getVal('statusIbu') === 'Hidup' ? getVal('nikIbu') : null,
        phone_number: getVal('statusIbu') === 'Hidup' ? noHpIbu : null,
        education: getVal('pendidikanIbu'),
        occupation: getVal('pekerjaanIbu'),
        income_range: getVal('penghasilanIbu'),
        address: getVal('namaKantorIbu'),
        is_deceased: getVal('statusIbu') === 'Meninggal'
      });
    }

    const adaWali = getVal('adaWali') === 'true';
    if (adaWali && getVal('namaWali')) {
      guardiansPayload.push({
        student_id: studentId,
        relation_type: 'WALI', 
        full_name: getVal('namaWali'),
        occupation: `${getVal('hubunganWali')} - ${getVal('pekerjaanWali')}`,
        phone_number: getVal('noHpWali'),
      });
    }

    if (guardiansPayload.length > 0) {
      const { error: guardianError } = await supabaseAdmin
        .from("student_guardians")
        .insert(guardiansPayload);

      if (guardianError) console.error("⚠️ Guardian Insert Error:", guardianError);
    }

    // Step 8: Activity Log
    await supabaseAdmin.from("activity_logs").insert({
      action: "REGISTER_STUDENT_SPMB_V2",
      entity_type: "registrations",
      entity_id: regData.id,
      details: {
        registration_number,
        uploaded_files: Object.keys(uploadedFiles),
        user_agent: request.headers.get("user-agent")
      },
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown"
    });

    // Step 9: Send Confirmation Notification (Email & WhatsApp)
    let notificationResult = null;
    try {
      const parentEmail = getVal('emailAyah') || getVal('emailIbu');
      
      const messages = generateRegistrationConfirmation({
        studentName: namaLengkap,
        registrationNumber: registration_number,
        parentName: primaryContactName
      });

      notificationResult = await sendNotification({
        phone: primaryContactPhone,
        email: parentEmail,
        whatsappMessage: messages.whatsappMessage,
        emailSubject: messages.emailSubject,
        emailHtml: messages.emailHtml
      });

      console.log("📧 Registration confirmation sent:", notificationResult);
    } catch (notifErr) {
      console.error("⚠️ Notification error (non-blocking):", notifErr);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      registration_number,
      message: "Indent berhasil! Data & Dokumen telah tersimpan.",
      notification_sent: notificationResult?.success || false
    }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return new Response(JSON.stringify({ error: "Terjadi kesalahan server: " + err.message }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
  }
}
