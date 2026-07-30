import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus di-set di .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createAdmin() {
  const email = 'penelitian.mitra@gmail.com';
  const password = '#Rahasia25++';
  const full_name = 'Super Admin';
  const role = 'super_admin';

  try {
    // Check if user already exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      console.log('Admin already exists:', email);
      process.exit(0);
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role }
    });

    if (authError) {
      console.error('Auth error:', authError.message);
      process.exit(1);
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
      console.error('Database error:', error.message);
      process.exit(1);
    }

    console.log('✅ Admin berhasil dibuat!');
    console.log('Email:', email);
    console.log('Role:', role);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
