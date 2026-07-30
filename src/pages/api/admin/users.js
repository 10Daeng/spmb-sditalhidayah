export const prerender = false;

import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';

// Hierarchy: super_admin > kepsek > admin_tu > others
const ROLE_HIERARCHY = {
  super_admin: 100,
  kepsek: 90,
  admin_tu: 80,
  tim_media: 70,
  keuangan: 70,
  panitia_spmb: 70,
  guru: 60,
  walas: 60,
  walimurid: 50,
  siswa: 40
};

function canManageRole(userRole, targetRole) {
  if (userRole === 'super_admin') return true;
  if (userRole === 'kepsek') return targetRole !== 'super_admin';
  if (userRole === 'admin_tu') {
    return ROLE_HIERARCHY[targetRole] < ROLE_HIERARCHY.admin_tu;
  }
  return false;
}

function getCreatableRoles(userRole) {
  if (userRole === 'super_admin') return Object.keys(ROLE_HIERARCHY);
  if (userRole === 'kepsek') return Object.keys(ROLE_HIERARCHY).filter(r => r !== 'super_admin');
  if (userRole === 'admin_tu') return Object.keys(ROLE_HIERARCHY).filter(r => ROLE_HIERARCHY[r] < ROLE_HIERARCHY.admin_tu);
  return [];
}

export async function GET({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const role = url.searchParams.get('role');
    const search = url.searchParams.get('search');

    let query = supabaseAdmin
      .from('users')
      .select('id, name, email, role, phone, is_active, created_at');

    // Super_admin selalu disembunyikan dari daftar
    query = query.neq('role', 'super_admin');

    // Admin_tu tidak bisa lihat kepsek
    if (auth.user?.role === 'admin_tu') {
      query = query.neq('role', 'kepsek');
    }

    if (id) query = query.eq('id', id);
    if (role) query = query.eq('role', role);
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    return new Response(JSON.stringify({ 
      success: true, 
      data: data || [],
      viewerRole: auth.user?.role,
      creatableRoles: getCreatableRoles(auth.user?.role)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { name, email, password, role, phone } = body;

    if (!name || !email || !password || !role) {
      return new Response(JSON.stringify({ error: 'Semua field wajib diisi' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check hierarchy
    if (!canManageRole(auth.user?.role, role)) {
      return new Response(JSON.stringify({ error: 'Anda tidak punya izin untuk membuat role ini' }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ name, role, phone })
      .eq('supabase_uid', authData.user.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'User berhasil dibuat',
      data: { id: authData.user.id, email }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
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
    const { id, name, role, phone, is_active, password } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID user wajib diisi' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('role, supabase_uid')
      .eq('id', id)
      .single();

    if (!canManageRole(auth.user?.role, targetUser?.role)) {
      return new Response(JSON.stringify({ error: 'Anda tidak punya izin untuk mengedit user ini' }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      });
    }

    // If changing role, check if new role is allowed
    if (role && !canManageRole(auth.user?.role, role)) {
      return new Response(JSON.stringify({ error: 'Anda tidak punya izin untuk assign role ini' }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      });
    }

    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { error } = await supabaseAdmin.from('users').update(updateData).eq('id', id);
    if (error) throw error;

    if (password && targetUser?.supabase_uid) {
      await supabaseAdmin.auth.admin.updateUserById(targetUser.supabase_uid, { password });
    }

    return new Response(JSON.stringify({ success: true, message: 'User berhasil diupdate' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID user wajib diisi' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('role, supabase_uid')
      .eq('id', id)
      .single();

    if (targetUser?.role === 'super_admin') {
      return new Response(JSON.stringify({ error: 'Super Admin tidak bisa dihapus' }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!canManageRole(auth.user?.role, targetUser?.role)) {
      return new Response(JSON.stringify({ error: 'Anda tidak punya izin untuk menghapus user ini' }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (targetUser?.supabase_uid) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.supabase_uid);
      if (authError) throw authError;
    }

    return new Response(JSON.stringify({ success: true, message: 'User berhasil dihapus' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
