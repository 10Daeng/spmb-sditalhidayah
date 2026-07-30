export const prerender = false;

import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';

export async function GET({ request }) {
  // Allow all admin roles to access, but filter results based on role
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu', 'guru']);
  if (!auth.authorized) return auth.response;

  const viewerRole = auth.user?.role || 'guru';
  const viewerId = auth.user?.id;

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const search = url.searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Role-based filtering
    if (viewerRole === 'admin_tu') {
      // Admin TU can only see admin_tu and guru (hide super_admin)
      query = query.in('role', ['admin_tu', 'guru']);
    } else if (viewerRole === 'guru') {
      // Guru can only see themselves
      query = query.eq('id', viewerId);
    }
    // super_admin sees all (no filter)

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return new Response(JSON.stringify({ data: [], error: error.message, total: 0 }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch dynamic roles from DB
    const { data: rolesData } = await supabaseAdmin.from('roles').select('name, label').eq('is_active', true);
    
    // Get Supabase auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    const authMap = {};
    if (!authError && authUsers?.users) {
      authUsers.users.forEach(u => {
        authMap[u.id] = { email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at };
      });
    }

    // Get latest activity log per user
    const userIds = (data || []).map(u => u.id);
    let activityMap = {};
    if (userIds.length) {
      const { data: logs } = await supabaseAdmin
        .from('activity_logs')
        .select('user_id, action, created_at')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });
      if (logs) {
        logs.forEach(log => {
          if (!activityMap[log.user_id]) {
            activityMap[log.user_id] = log;
          }
        });
      }
    }

    const enrichedData = (data || []).map(u => ({
      ...u,
      auth_email: authMap[u.supabase_uid]?.email || u.email || '-',
      auth_created_at: authMap[u.supabase_uid]?.created_at,
      last_sign_in_at: authMap[u.supabase_uid]?.last_sign_in_at,
      last_activity: activityMap[u.id] || null
    }));

    return new Response(JSON.stringify({
      success: true,
      data: enrichedData,
      roles: rolesData || [],
      total: count || 0,
      page,
      limit,
      viewerRole,
      viewerId
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ data: [], error: err.message, total: 0 }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST({ request }) {
  const auth = await requireAuth(request, ['super_admin']);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { email, password, full_name, role, phone, is_active } = body;

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Email, password, nama, dan role wajib diisi' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name, role }
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert({
        supabase_uid: authData.user.id,
        email, full_name, role,
        phone: phone || null,
        is_active: is_active !== false
      }, { onConflict: 'supabase_uid' })
      .select()
      .single();

    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Log activity
    await supabaseAdmin.from('activity_logs').insert({
      user_id: auth.user?.id,
      action: 'CREATE_ADMIN_USER',
      entity_type: 'users',
      entity_id: data.id,
      details: { email, role, full_name },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return new Response(JSON.stringify({ success: true, data, message: 'Admin berhasil ditambahkan' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT({ request }) {
  const auth = await requireAuth(request, ['super_admin']);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { id, full_name, role, phone, is_active, email, reset_password, new_password } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID wajib diisi' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: userData } = await supabaseAdmin.from('users').select('supabase_uid').eq('id', id).single();
    const supabaseUid = userData?.supabase_uid;

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (role !== undefined) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (email !== undefined) updateData.email = email;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (email && supabaseUid) {
      await supabaseAdmin.auth.admin.updateUserById(supabaseUid, { email });
    }
    if (reset_password && new_password && supabaseUid) {
      await supabaseAdmin.auth.admin.updateUserById(supabaseUid, { password: new_password });
    }

    // Log activity
    await supabaseAdmin.from('activity_logs').insert({
      user_id: auth.user?.id,
      action: 'UPDATE_ADMIN_USER',
      entity_type: 'users',
      entity_id: id,
      details: { updated_fields: Object.keys(updateData), reset_password: !!reset_password },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return new Response(JSON.stringify({ success: true, data, message: 'Admin berhasil diupdate' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
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
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prevent deleting yourself
    if (id === auth.user?.id) {
      return new Response(JSON.stringify({ error: 'Tidak bisa menghapus akun sendiri' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: userData } = await supabaseAdmin.from('users').select('supabase_uid, role').eq('id', id).single();
    const supabaseUid = userData?.supabase_uid;

    // Prevent deleting last superadmin
    if (userData?.role === 'super_admin') {
      const { count } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'super_admin').eq('is_active', true);
      if (count <= 1) {
        return new Response(JSON.stringify({ error: 'Tidak bisa menghapus superadmin terakhir' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const { error } = await supabaseAdmin.from('users').delete().eq('id', id);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (supabaseUid) {
      await supabaseAdmin.auth.admin.deleteUser(supabaseUid);
    }

    // Log activity
    await supabaseAdmin.from('activity_logs').insert({
      user_id: auth.user?.id,
      action: 'DELETE_ADMIN_USER',
      entity_type: 'users',
      entity_id: id,
      details: { deleted_role: userData?.role },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return new Response(JSON.stringify({ success: true, message: 'Admin berhasil dihapus' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}