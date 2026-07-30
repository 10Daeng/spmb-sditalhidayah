export const prerender = false;

import { supabaseAdmin } from "../../../lib/supabase";

export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const paymentId = formData.get('payment_id');
    const regNumber = formData.get('reg_number');

    if (!file || !paymentId || !regNumber) {
      return new Response(JSON.stringify({ error: 'Data tidak lengkap' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Verify this payment belongs to the registration
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('payments')
      .select('*, registrations(registration_number)')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment || payment.registrations.registration_number !== regNumber) {
      return new Response(JSON.stringify({ error: 'Data pembayaran tidak valid' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `payment_proof_${regNumber}_${Date.now()}.${fileExt}`;
    const filePath = `payments/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('public-images')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('public-images')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // 3. Update payment record
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({ proof_image_url: publicUrl })
      .eq('id', paymentId);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      url: publicUrl,
      message: 'Bukti pembayaran berhasil diunggah dan menunggu konfirmasi admin.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Payment upload error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
