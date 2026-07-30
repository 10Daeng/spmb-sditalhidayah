export const prerender = false;

import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';

export async function GET({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('broadcasts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;

    if (error) {
      return new Response(JSON.stringify({ data: [], error: error.message, total: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      limit
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Broadcast fetch error:', err);
    return new Response(JSON.stringify({ data: [], error: err.message, total: 0 }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { title, message, target_type, target_ids, send_email, send_whatsapp, send_in_app, scheduled_at } = body;

    if (!title || !message) {
      return new Response(JSON.stringify({ error: 'Judul dan pesan wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get target registrations count
    let recipientCount = 0;
    try {
      let regQuery = supabaseAdmin.from('registrations').select('id', { count: 'exact', head: true });
      if (target_type === 'pending') regQuery = regQuery.eq('status', 'pending');
      else if (target_type === 'verified') regQuery = regQuery.eq('status', 'verified');
      else if (target_type === 'lulus') regQuery = regQuery.eq('status', 'lulus');
      else if (target_type === 'tidak_lulus') regQuery = regQuery.eq('status', 'tidak_lulus');
      else if (target_type === 'custom' && target_ids?.length) {
        regQuery = supabaseAdmin.from('registrations').select('id', { count: 'exact', head: true }).in('id', target_ids);
      }
      const { count } = await regQuery;
      recipientCount = count || 0;
    } catch (e) {}

    const { data, error } = await supabaseAdmin
      .from('broadcasts')
      .insert({
        title,
        message,
        target_type: target_type || 'all',
        target_ids: target_ids || [],
        send_email: send_email || false,
        send_whatsapp: send_whatsapp || false,
        send_in_app: send_in_app !== false,
        recipient_count: recipientCount,
        status: 'sent',
        sent_by: auth.user?.id,
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Auto-create in-app notifications for all matching registrations
    if (send_in_app !== false && recipientCount > 0) {
      try {
        let regQuery = supabaseAdmin.from('registrations').select('id');
        if (target_type === 'pending') regQuery = regQuery.eq('status', 'pending');
        else if (target_type === 'verified') regQuery = regQuery.eq('status', 'verified');
        else if (target_type === 'lulus') regQuery = regQuery.eq('status', 'lulus');
        else if (target_type === 'tidak_lulus') regQuery = regQuery.eq('status', 'tidak_lulus');
        else if (target_type === 'custom' && target_ids?.length) regQuery = regQuery.in('id', target_ids);

        const { data: regs } = await regQuery;
        if (regs && regs.length) {
          const notifications = regs.map(r => ({
            registration_id: r.id,
            title,
            message,
            type: 'broadcast',
            is_read: false
          }));
          // Insert in batches of 100
          for (let i = 0; i < notifications.length; i += 100) {
            const batch = notifications.slice(i, i + 100);
            await supabaseAdmin.from('notifications').insert(batch);
          }
        }
      } catch (e) { console.error('Notification insert error:', e); }
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Broadcast create error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE({ request }) {
  const auth = await requireAuth(request, ['super_admin']);
  if (!auth.authorized) return auth.response;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error } = await supabaseAdmin
      .from('broadcasts')
      .delete()
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Broadcast dihapus' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Broadcast delete error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}