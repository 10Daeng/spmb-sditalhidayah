export const prerender = false;

import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';

export async function GET({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { data, error } = await supabaseAdmin.from('settings').select('key,value');
    if (error) {
      return new Response(JSON.stringify({}), { headers: { 'Content-Type': 'application/json' } });
    }
    const settings = {};
    data?.forEach(s => { settings[s.key] = s.value; });
    return new Response(JSON.stringify(settings), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({}), { headers: { 'Content-Type': 'application/json' } });
  }
}

export async function POST({ request }) {
  const auth = await requireAuth(request, ['super_admin']);
  if (!auth.authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await request.json();
    const updates = Object.entries(body);

    for (const [key, value] of updates) {
      const { error } = await supabaseAdmin.from('settings').upsert(
        { key, value, group_name: 'general' },
        { onConflict: 'key' }
      );
      if (error) console.error('Settings upsert error for key:', key, error);
    }

    return new Response(JSON.stringify({ success: true, message: 'Pengaturan berhasil disimpan' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}