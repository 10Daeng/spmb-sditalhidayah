export const prerender = false;

import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';

export async function GET({ request }) {
  try {
    const { data, error } = await supabaseAdmin
      .from('spmb_settings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: data || null
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const {
      academic_year,
      registration_start, registration_end, test_date, announcement_date,
      fee_regular, fee_indent,
      quota_class1, quota_other_classes, max_per_class,
      requirements_html,
      contact_phone, contact_whatsapp, contact_email,
      bank_account
    } = body;

    const { data: existing } = await supabaseAdmin
      .from('spmb_settings')
      .select('id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (academic_year !== undefined) updateData.academic_year = academic_year;
    if (registration_start !== undefined) updateData.registration_start = registration_start;
    if (registration_end !== undefined) updateData.registration_end = registration_end;
    if (test_date !== undefined) updateData.test_date = test_date;
    if (announcement_date !== undefined) updateData.announcement_date = announcement_date;
    if (fee_regular !== undefined) updateData.fee_regular = fee_regular;
    if (fee_indent !== undefined) updateData.fee_indent = fee_indent;
    if (quota_class1 !== undefined) updateData.quota_class1 = quota_class1;
    if (quota_other_classes !== undefined) updateData.quota_other_classes = quota_other_classes;
    if (max_per_class !== undefined) updateData.max_per_class = max_per_class;
    if (requirements_html !== undefined) updateData.requirements_html = requirements_html;
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone;
    if (contact_whatsapp !== undefined) updateData.contact_whatsapp = contact_whatsapp;
    if (contact_email !== undefined) updateData.contact_email = contact_email;
    if (bank_account !== undefined) updateData.bank_account = bank_account;

    let result;
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('spmb_settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();
      result = { data, error };
    } else {
      const { data, error } = await supabaseAdmin
        .from('spmb_settings')
        .insert({ ...updateData, is_active: true })
        .select()
        .single();
      result = { data, error };
    }

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, data: result.data, message: 'Pengaturan SPMB berhasil diupdate' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}