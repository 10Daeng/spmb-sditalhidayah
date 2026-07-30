export const prerender = false;

import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';

export async function GET({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      const { data, error } = await supabaseAdmin
        .from('roles')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await supabaseAdmin
      .from('roles')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return new Response(JSON.stringify({ success: true, data: data || [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek']);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { name, label, description, permissions } = body;

    if (!name || !label) {
      return new Response(JSON.stringify({ error: 'Nama dan label role wajib diisi' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await supabaseAdmin
      .from('roles')
      .insert({ name, label, description, permissions: permissions || [] })
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify({ success: true, data, message: 'Role berhasil dibuat' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek']);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { id, label, description, permissions, is_active } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID role wajib diisi' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const updateData = { updated_at: new Date().toISOString() };
    if (label !== undefined) updateData.label = label;
    if (description !== undefined) updateData.description = description;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('roles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify({ success: true, data, message: 'Role berhasil diupdate' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek']);
  if (!auth.authorized) return auth.response;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID role wajib diisi' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Cek apakah role adalah system role
    const { data: roleData } = await supabaseAdmin
      .from('roles')
      .select('is_system, name')
      .eq('id', id)
      .single();

    if (roleData?.is_system) {
      return new Response(JSON.stringify({ error: 'Role bawaan sistem tidak bisa dihapus' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error } = await supabaseAdmin.from('roles').delete().eq('id', id);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: 'Role berhasil dihapus' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
