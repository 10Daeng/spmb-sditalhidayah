export const prerender = false;

import { supabaseAdmin } from "../../../lib/supabase";
import { 
  getClientIP, 
  checkIPRateLimit, 
  checkPhoneRateLimit,
  rateLimitResponse 
} from "../../../lib/rateLimit";
import { 
  validatePhone, 
  validateRequired,
  sanitizeText 
} from "../../../lib/validation";

export async function POST({ request }) {
  try {
    const clientIP = getClientIP(request);
    
    // Check IP-based rate limit
    const ipLimit = checkIPRateLimit(clientIP, { maxAttempts: 20 });
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit.error);
    }
    
    const formData = await request.formData();
    
    const getVal = (key) => {
        const val = formData.get(key);
        if (val === 'null' || val === 'undefined' || val === '' || val === null) return null;
        return sanitizeText(val.toString());
    };

    const namaLengkap = getVal('namaLengkap');
    const namaOrangTua = getVal('namaOrangTua');
    const noHp = getVal('noHp');
    const email = getVal('email');
    const jalur = getVal('jalur') || 'murid_baru';

    if (noHp) {
      const phoneLimit = checkPhoneRateLimit(noHp, { maxAttempts: 3 });
      if (!phoneLimit.allowed) {
        return rateLimitResponse(phoneLimit.error);
      }
    }

    const validationErrors = [];
    if (!validateRequired(namaLengkap, 'Nama Anak', 3).valid) validationErrors.push("Nama Anak wajib diisi");
    if (!validateRequired(namaOrangTua, 'Nama Orang Tua', 3).valid) validationErrors.push("Nama Orang Tua wajib diisi");
    
    const phoneValidation = validatePhone(noHp, true);
    if (!phoneValidation.valid) validationErrors.push(`No. HP: ${phoneValidation.error}`);

    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({ error: "Validasi gagal", errors: validationErrors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate Registration Number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const crypto = await import('node:crypto');
    const randomBytes = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
    const registration_number = `REG-${dateStr}-${randomBytes}`;

    const registrationData = {
      registration_number,
      student_full_name: namaLengkap,
      parent_name: namaOrangTua,
      parent_phone: noHp,
      parent_email: email || `${registration_number.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
      track: jalur,
      status: "pending_payment" // Indent mode starts with pending_payment
    };

    const { data: regData, error: regError } = await supabaseAdmin
      .from("registrations")
      .insert(registrationData)
      .select()
      .single();

    if (regError) {
       console.error("❌ Registration DB Error:", regError);
       return new Response(JSON.stringify({ error: "Gagal membuat registrasi: " + regError.message }), { status: 500 });
    }

    // Insert into activity_logs
    await supabaseAdmin.from("activity_logs").insert({
      action: "REGISTER_INDENT",
      entity_type: "registrations",
      entity_id: regData.id,
      details: { registration_number },
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown"
    });

    return new Response(JSON.stringify({ 
      success: true, 
      registration_number,
      message: "Pendaftaran Indent berhasil!"
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
