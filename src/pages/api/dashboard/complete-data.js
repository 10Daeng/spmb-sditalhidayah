
export const prerender = false;

import { supabaseAdmin } from "../../../lib/supabase";

/**
 * API untuk menyimpan data lengkap siswa
 * Diakses setelah pendaftaran diverifikasi
 */

export async function POST({ request }) {
  try {
    const formData = await request.formData();
    
    // Helper to get value
    const getVal = (key) => {
      const val = formData.get(key);
      if (val === 'null' || val === 'undefined' || val === '' || val === null) return null;
      return val.toString();
    };

    const registrationNumber = getVal('registration_number');
    
    if (!registrationNumber) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Nomor registrasi diperlukan" 
      }), { status: 400, headers: { "Content-Type": "application/json" }});
    }

    // Fetch registration
    const { data: registration, error: regError } = await supabaseAdmin
      .from('registrations')
      .select('*, students(*)')
      .eq('registration_number', registrationNumber)
      .single();

    if (regError || !registration) {
      console.error("Registration not found:", regError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Pendaftaran tidak ditemukan" 
      }), { status: 404, headers: { "Content-Type": "application/json" }});
    }

    // Check status
    if (!['verified', 'document_complete'].includes(registration.status)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Status pendaftaran tidak memungkinkan untuk melengkapi data" 
      }), { status: 400, headers: { "Content-Type": "application/json" }});
    }

    // =====================
    // Handle File Uploads
    // =====================
    const uploadedFiles = {};
    const fileKeys = ['fileKK', 'fileAkta', 'fileFoto', 'fileIjazahTK', 'fileRaport', 'fileSKHB'];
    
    for (const key of fileKeys) {
      const file = formData.get(key);
      if (file && typeof file === 'object' && file.name && file.size > 0) {
        try {
          const fileExt = file.name.split('.').pop();
          const safeName = `${key}_${Date.now()}.${fileExt}`;
          const filePath = `complete-data/${registrationNumber}/${safeName}`;

          const { error: uploadError } = await supabaseAdmin
            .storage
            .from('ppdb-documents')
            .upload(filePath, file, {
              contentType: file.type || 'application/octet-stream',
              upsert: true
            });

          if (uploadError) {
            console.error(`Upload error (${key}):`, uploadError.message);
          } else {
            const { data: { publicUrl } } = supabaseAdmin
              .storage
              .from('ppdb-documents')
              .getPublicUrl(filePath);
            
            uploadedFiles[key] = publicUrl;
            console.log(`✅ Uploaded ${key}: ${publicUrl}`);
          }
        } catch (uErr) {
          console.error(`Upload exception (${key}):`, uErr);
        }
      }
    }

    // =====================
    // Update Student Data
    // =====================
    const studentId = registration.students?.id;
    
    if (studentId) {
      const studentUpdate = {
        blood_type: getVal('golonganDarahSiswa'),
        height_cm: getVal('tinggiBadan') ? parseFloat(getVal('tinggiBadan')) : null,
        weight_kg: getVal('beratBadan') ? parseFloat(getVal('beratBadan')) : null,
        uniform_size: getVal('ukuranBaju'),
        shoe_size: getVal('ukuranSepatu') ? parseInt(getVal('ukuranSepatu')) : null,
        
        // Emergency contact
        emergency_contact_name: getVal('namaKontakDarurat'),
        emergency_contact_relation: getVal('hubunganKontakDarurat'),
        emergency_contact_phone: getVal('noHpKontakDarurat'),
        
        // Additional
        special_notes: getVal('catatanKhusus'),
        rhesus: getVal('rhesus'),
        
        // Document URLs (merge with existing)
        document_urls: {
          ...(registration.students?.document_urls || {}),
          ...uploadedFiles
        },
        
        // Timestamps
        data_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Attempt update (ignore column errors)
      const { error: studentUpdateError } = await supabaseAdmin
        .from('students')
        .update(studentUpdate)
        .eq('id', studentId);

      if (studentUpdateError) {
        console.error("Student update error:", studentUpdateError);
        // Try without potentially missing columns
        const safeUpdate = {
          special_notes: getVal('catatanKhusus'),
          updated_at: new Date().toISOString()
        };
        await supabaseAdmin.from('students').update(safeUpdate).eq('id', studentId);
      }
    }

    // =====================
    // Update Registration Status
    // =====================
    const { error: statusError } = await supabaseAdmin
      .from('registrations')
      .update({ 
        status: 'document_complete',
        documents_submitted_at: new Date().toISOString(),
        statement_data_correct: getVal('pernyataanDataBenar') === 'true',
        statement_follow_rules: getVal('pernyataanTaatPeraturan') === 'true',
        statement_financial: getVal('pernyataanBiaya') === 'true'
      })
      .eq('id', registration.id);

    if (statusError) {
      console.error("Status update error:", statusError);
    }

    // =====================
    // Activity Log
    // =====================
    await supabaseAdmin.from('activity_logs').insert({
      action: 'COMPLETE_STUDENT_DATA',
      entity_type: 'registrations',
      entity_id: registration.id,
      details: {
        registration_number: registrationNumber,
        files_uploaded: Object.keys(uploadedFiles)
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    });

    console.log(`✅ Data completed for: ${registrationNumber}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Data berhasil dilengkapi",
      files_uploaded: Object.keys(uploadedFiles).length
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Complete data error:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * GET - Fetch existing completed data
 */
export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const registrationNumber = url.searchParams.get('reg');
    
    if (!registrationNumber) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Nomor registrasi diperlukan" 
      }), { status: 400, headers: { "Content-Type": "application/json" }});
    }

    const { data, error } = await supabaseAdmin
      .from('registrations')
      .select(`
        *,
        students (
          id,
          full_name,
          blood_type,
          height_cm,
          weight_kg,
          uniform_size,
          shoe_size,
          emergency_contact_name,
          emergency_contact_relation,
          emergency_contact_phone,
          special_notes,
          document_urls
        )
      `)
      .eq('registration_number', registrationNumber)
      .single();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data 
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Get complete data error:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" }
    });
  }
}
