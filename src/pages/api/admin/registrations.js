
export const prerender = false;

import { supabaseAdmin } from "../../../lib/supabase";
import { 
  sendNotification, 
  generateVerificationApproved, 
  generateRejection,
  generateRegistrationConfirmation
} from "../../../lib/notification";
import { requireAuth } from "../../../lib/auth";

// ============================================
// GET - Fetch all registrations (PROTECTED)
// ============================================
export async function GET({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    
    let query = supabaseAdmin
      .from("registrations")
      .select("*")
      .order("created_at", { ascending: false });
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    } else {
      query = query.in("status", ["pending", "verified", "document_complete", "calon_peserta", "assessment", "interview", "rejected", "scheduled", "lulus", "cadangan", "tidak_lulus", "enrolled"]);
    }
    
    const { data, error } = await query;

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("❌ GET registrations error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}

// ============================================
// POST - Approve or Reject registration (PROTECTED)
// ============================================
export async function POST({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;
  try {
    const body = await request.json();
    const { action, registrationId, reason, sendNotif = true } = body;

    // Fetch registration data first
    const { data: registration, error: fetchError } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('id', registrationId)
      .single();

    if (fetchError || !registration) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Pendaftaran tidak ditemukan" 
      }), { status: 404 });
    }

    // ========================
    // APPROVE
    // ========================
    if (action === 'approve') {
      // 1. Update Registration Status
      const { error: regError } = await supabaseAdmin
        .from('registrations')
        .update({ 
          status: 'verified', 
          verified_at: new Date().toISOString() 
        })
        .eq('id', registrationId);

      if (regError) throw regError;

      // 2. Send Notification (Email & WhatsApp)
      let notificationResult = null;
      if (sendNotif) {
        try {
          const messages = generateVerificationApproved({
            studentName: registration.student_full_name,
            registrationNumber: registration.registration_number,
            parentName: registration.parent_name,
            activationUrl: `${request.headers.get('origin')}/dashboard/lengkapi-data?reg=${registration.registration_number}`
          });

          notificationResult = await sendNotification({
            phone: registration.parent_phone,
            email: registration.parent_email,
            whatsappMessage: messages.whatsappMessage,
            emailSubject: messages.emailSubject,
            emailHtml: messages.emailHtml
          });

          console.log("📧 Notification sent:", notificationResult);
        } catch (notifErr) {
          console.error("⚠️ Notification error (non-blocking):", notifErr);
        }
      }

      // 3. Create In-App Notification
      try {
        await supabaseAdmin.from("notifications").insert({
          title: "Pendaftaran Terverifikasi",
          message: `Pendaftaran ${registration.student_full_name} (${registration.registration_number}) telah disetujui.`,
          type: "success",
          link: `/admin/siswa`,
          entity_type: "registrations",
          entity_id: registrationId
        });
      } catch (notifErr) { console.error("In-app notification error:", notifErr); }

      // 4. Log Activity
      await supabaseAdmin.from("activity_logs").insert({
        action: "VERIFY_REGISTRATION_APPROVED",
        entity_type: "registrations",
        entity_id: registrationId,
        details: { 
          registration_number: registration.registration_number,
          notification_sent: notificationResult?.success || false
        },
        ip_address: request.headers.get("x-forwarded-for") || "unknown"
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Pendaftaran disetujui",
        notification: notificationResult
      }), { status: 200 });
    }

    // ========================
    // REJECT
    // ========================
    if (action === 'reject') {
      // 1. Update Registration Status
      const { error } = await supabaseAdmin
        .from('registrations')
        .update({ 
          status: 'rejected', 
          verified_at: new Date().toISOString(),
          verification_notes: reason 
        })
        .eq('id', registrationId);
      
      if (error) throw error;

      // 2. Send Notification (Email & WhatsApp)
      let notificationResult = null;
      if (sendNotif) {
        try {
          const messages = generateRejection({
            studentName: registration.student_full_name,
            registrationNumber: registration.registration_number,
            parentName: registration.parent_name,
            reason: reason
          });

          notificationResult = await sendNotification({
            phone: registration.parent_phone,
            email: registration.parent_email,
            whatsappMessage: messages.whatsappMessage,
            emailSubject: messages.emailSubject,
            emailHtml: messages.emailHtml
          });

          console.log("📧 Rejection notification sent:", notificationResult);
        } catch (notifErr) {
          console.error("⚠️ Notification error (non-blocking):", notifErr);
        }
      }

      // 3. Create In-App Notification
      try {
        await supabaseAdmin.from("notifications").insert({
          title: "Pendaftaran Ditolak",
          message: `Pendaftaran ${registration.student_full_name} (${registration.registration_number}) telah ditolak.`,
          type: "error",
          link: `/admin/siswa`,
          entity_type: "registrations",
          entity_id: registrationId
        });
      } catch (notifErr) { console.error("In-app notification error:", notifErr); }

      // 4. Log Activity
      await supabaseAdmin.from("activity_logs").insert({
        action: "VERIFY_REGISTRATION_REJECTED",
        entity_type: "registrations",
        entity_id: registrationId,
        details: { 
          registration_number: registration.registration_number,
          reason: reason,
          notification_sent: notificationResult?.success || false
        },
        ip_address: request.headers.get("x-forwarded-for") || "unknown"
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Pendaftaran ditolak",
        notification: notificationResult
      }), { status: 200 });
    }

    // ========================
    // SCHEDULE TEST
    // ========================
    if (action === 'schedule') {
      const { testDate, testTime, testLocation } = body;
      
      const { error } = await supabaseAdmin
        .from('registrations')
        .update({ 
          status: 'scheduled',
          test_date: testDate,
          test_time: testTime,
          test_location: testLocation
        })
        .eq('id', registrationId);
      
      if (error) throw error;

      // Create In-App Notification
      try {
        await supabaseAdmin.from("notifications").insert({
          title: "Jadwal Tes Diatur",
          message: `Jadwal tes untuk ${registration.student_full_name} (${registration.registration_number}) telah diatur: ${testDate} ${testTime}.`,
          type: "info",
          link: `/admin/siswa`,
          entity_type: "registrations",
          entity_id: registrationId
        });
      } catch (notifErr) { console.error("In-app notification error:", notifErr); }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Jadwal tes berhasil diatur"
      }), { status: 200 });
    }

    // ========================
    // ANNOUNCE RESULT
    // ========================
    if (action === 'result') {
      const { resultStatus } = body; // expect 'lulus', 'cadangan', or 'tidak_lulus'
      
      const { error } = await supabaseAdmin
        .from('registrations')
        .update({ 
          status: resultStatus,
          result_announced_at: new Date().toISOString()
        })
        .eq('id', registrationId);
      
      if (error) throw error;

      // Create In-App Notification
      let notifTitle = "Pengumuman Hasil Seleksi";
      let notifType = "info";
      if (resultStatus === 'lulus') { notifTitle = "Siswa Lulus"; notifType = "success"; }
      else if (resultStatus === 'cadangan') { notifTitle = "Siswa Masuk Cadangan"; notifType = "warning"; }
      else if (resultStatus === 'tidak_lulus') { notifTitle = "Siswa Tidak Lulus"; notifType = "error"; }

      try {
        await supabaseAdmin.from("notifications").insert({
          title: notifTitle,
          message: `${registration.student_full_name} (${registration.registration_number}) ditetapkan sebagai ${resultStatus.toUpperCase().replace('_', ' ')}.`,
          type: notifType,
          link: `/admin/siswa`,
          entity_type: "registrations",
          entity_id: registrationId
        });
      } catch (notifErr) { console.error("In-app notification error:", notifErr); }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Status berhasil diubah menjadi ${resultStatus.toUpperCase().replace('_', ' ')}`
      }), { status: 200 });
    }

    // ========================
    // NEW STATUS PROGRESSIONS
    // ========================
    if (['set_calon_peserta', 'approve_assessment', 'approve_interview'].includes(action)) {
      let newStatus = '';
      let logAction = '';
      let logMessage = '';

      if (action === 'set_calon_peserta') {
        newStatus = 'calon_peserta';
        logAction = 'SET_CALON_PESERTA';
        logMessage = 'Ditetapkan sebagai Calon Peserta';
      } else if (action === 'approve_assessment') {
        newStatus = 'assessment';
        logAction = 'APPROVE_ASSESSMENT';
        logMessage = 'Lulus tahap Assessment & Observasi';
      } else if (action === 'approve_interview') {
        newStatus = 'interview';
        logAction = 'APPROVE_INTERVIEW';
        logMessage = 'Selesai tahap Wawancara';
      }

      const { error } = await supabaseAdmin
        .from('registrations')
        .update({ status: newStatus })
        .eq('id', registrationId);
      
      if (error) throw error;

      // Log Activity
      await supabaseAdmin.from("activity_logs").insert({
        action: logAction,
        entity_type: "registrations",
        entity_id: registrationId,
        details: { registration_number: registration.registration_number },
        ip_address: request.headers.get("x-forwarded-for") || "unknown"
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: logMessage
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: "Invalid action" 
    }), { status: 400 });

  } catch (err) {
    console.error("❌ POST registrations error:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), { status: 500 });
  }
}

// ============================================
// PUT - Update registration data (PROTECTED)
// ============================================
export async function PUT({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;
  try {
    const body = await request.json();
    const { action, registrationId, data } = body;
    
    if (action === 'update' && registrationId) {
      const { error } = await supabaseAdmin
        .from('registrations')
        .update(data)
        .eq('id', registrationId);

      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Invalid action" 
    }), { status: 400 });
  } catch (err) {
    console.error("❌ PUT registrations error:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), { status: 500 });
  }
}

// ============================================
// DELETE - Delete registration (PROTECTED)
// ============================================
export async function DELETE({ request }) {
  const auth = await requireAuth(request, ['super_admin']);
  if (!auth.authorized) return auth.response;
  try {
    const url = new URL(request.url);
    const registrationId = url.searchParams.get('id');
    
    if (!registrationId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Registration ID required" 
      }), { status: 400 });
    }
    
    const { error } = await supabaseAdmin
      .from('registrations')
      .delete()
      .eq('id', registrationId);

    if (error) throw error;
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Pendaftaran dihapus" 
    }), { status: 200 });
  } catch (err) {
    console.error("❌ DELETE registrations error:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), { status: 500 });
  }
}
