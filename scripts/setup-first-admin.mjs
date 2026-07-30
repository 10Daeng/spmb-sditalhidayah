// =============================================
// Script: Setup First Admin After Total Reset
// =============================================
// 
// CARA PAKAI:
// 1. Jalankan migration 012_total_reset.sql di Supabase
// 2. Buka terminal, jalankan: node scripts/setup-first-admin.js
// 3. Masukkan email, password, dan nama admin
//
// =============================================

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function main() {
  console.log('=============================================');
  console.log('SETUP ADMIN PERTAMA - SISTER 1.0');
  console.log('=============================================\n');

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || await question('Masukkan Supabase URL: ');
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || await question('Masukkan Supabase Service Role Key: ');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const email = await question('Email admin: ');
  const password = await question('Password (min 6 karakter): ');
  const name = await question('Nama lengkap: ');
  const role = 'kepsek'; // Selalu buat sebagai kepsek (kepala sekolah)

  console.log('\nMembuat user...');

  try {
    // 1. Buat user di Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    });

    if (authError) {
      console.error('❌ Error membuat auth user:', authError.message);
      process.exit(1);
    }

    // 2. Buat profil di tabel users
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert({
        supabase_uid: authData.user.id,
        email,
        name,
        role,
        is_active: true
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error membuat profil:', profileError.message);
      process.exit(1);
    }

    console.log('\n✅ Admin berhasil dibuat!');
    console.log('=============================================');
    console.log('Email:', email);
    console.log('Nama:', name);
    console.log('Role:', role);
    console.log('=============================================');
    console.log('\nSekarang Anda bisa login di:');
    console.log('https://sditalhidayahsumenep.sch.id/admin/login');
    console.log('atau');
    console.log('http://localhost:4321/admin/login');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    rl.close();
  }
}

main();
