export const prerender = false;

import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';

export async function GET({ request }) {
  try {
    const { data, error } = await supabaseAdmin
      .from('site_settings')
      .select('*')
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
    
    const { data: existing } = await supabaseAdmin
      .from('site_settings')
      .select('id')
      .limit(1)
      .single();

    const updateData = { updated_at: new Date().toISOString() };
    
    const fields = [
      'school_name', 'school_subtitle', 'school_address', 'school_phone', 'school_email', 'school_whatsapp',
      'facebook_url', 'instagram_url', 'youtube_url',
      'default_meta_title', 'default_meta_description',
      'registration_open', 'show_test_schedule'
    ];
    
    fields.forEach(f => {
      if (body[f] !== undefined) updateData[f] = body[f];
    });

    let result;
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('site_settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();
      result = { data, error };
    } else {
      const { data, error } = await supabaseAdmin
        .from('site_settings')
        .insert(updateData)
        .select()
        .single();
      result = { data, error };
    }

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, data: result.data, message: 'Pengaturan berhasil disimpan' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}