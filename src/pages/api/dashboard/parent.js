
export const prerender = false;

import { supabaseAdmin } from "../../../lib/supabase";

/**
 * API untuk Parent Dashboard
 * Mendapatkan data pendaftaran berdasarkan nomor registrasi
 */

export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const registrationNumber = url.searchParams.get('reg');
    
    if (!registrationNumber) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Nomor registrasi diperlukan" 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Fetch registration by registration_number
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .select(`
        *,
        students (
          id,
          full_name,
          nickname,
          nik,
          place_of_birth,
          date_of_birth,
          gender,
          address_kk,
          profile_photo_url
        ),
        payments (*)
      `)
      .eq("registration_number", registrationNumber.trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Nomor registrasi tidak ditemukan" 
        }), { 
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      throw error;
    }

    // Mask sensitive data
    const maskedData = {
      ...data,
      parent_phone: data.parent_phone ? maskPhone(data.parent_phone) : null,
      parent_email: data.parent_email ? maskEmail(data.parent_email) : null
    };

    // Fetch settings
    const { data: settings } = await supabaseAdmin
      .from('spmb_settings')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();

    return new Response(JSON.stringify({ 
      success: true, 
      data: maskedData,
      settings: settings || {}
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("❌ Parent dashboard API error:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Helper: Mask phone number (081234567890 -> 0812****7890)
function maskPhone(phone) {
  if (!phone || phone.length < 8) return phone;
  const start = phone.slice(0, 4);
  const end = phone.slice(-4);
  return `${start}****${end}`;
}

// Helper: Mask email (test@email.com -> te***@email.com)
function maskEmail(email) {
  if (!email) return email;
  const [local, domain] = email.split('@');
  if (!domain || local.length < 2) return email;
  return `${local.slice(0, 2)}***@${domain}`;
}
