export const prerender = false;

import { supabaseAdmin } from '../../../lib/supabase.js';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { email, password, full_name, role } = body;

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Semua field wajib diisi' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role }
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert into users table
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        supabase_uid: authData.user.id,
        email,
        name: full_name,
        role,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      // Rollback
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data,
      message: `Admin ${role} berhasil dibuat: ${email}`
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
