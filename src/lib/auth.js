/**
 * SISTER 1.0 — Authentication Library
 * Menggunakan Supabase Auth untuk manajemen session
 * dengan role-based access control
 */

import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase.js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Client khusus untuk autentikasi (anon key, dibuat baru setiap kali agar tidak ada session state)
function createAuthClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

export const COOKIE_ACCESS_TOKEN = 'sb-access-token';
export const COOKIE_REFRESH_TOKEN = 'sb-refresh-token';
const SESSION_MAX_AGE = 60 * 60 * 24;

/**
 * Parse cookies from request headers
 */
export function parseCookies(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
}

/**
 * Get access token dari cookies
 */
export function getAccessToken(request) {
  const cookies = parseCookies(request);
  return cookies[COOKIE_ACCESS_TOKEN] || null;
}

/**
 * Get refresh token dari cookies
 */
export function getRefreshToken(request) {
  const cookies = parseCookies(request);
  return cookies[COOKIE_REFRESH_TOKEN] || null;
}

/**
 * Verifikasi session dan dapatkan user info
 */
export async function verifySession(request) {
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return { authenticated: false };
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !user) {
      const refreshed = await tryRefreshSession(request);
      if (refreshed) {
        return refreshed;
      }
      return { authenticated: false };
    }

    const profile = await getUserProfile(user.id);

    if (!profile || !profile.is_active) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        ...profile
      },
      role: profile.role || 'walimurid'
    };
  } catch (err) {
    console.error('Session verification error:', err);
    return { authenticated: false };
  }
}

/**
 * Coba refresh session menggunakan refresh token
 */
async function tryRefreshSession(request) {
  const refreshToken = getRefreshToken(request);

  if (!refreshToken) {
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error || !data.session) {
      return null;
    }

    const profile = await getUserProfile(data.user.id);

    if (!profile || !profile.is_active) {
      return null;
    }

    return {
      authenticated: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        ...profile
      },
      role: profile.role || 'walimurid',
      newSession: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      }
    };
  } catch (err) {
    return null;
  }
}

/**
 * Get user profile dari tabel public.users
 */
async function getUserProfile(authUserId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('supabase_uid', authUserId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      // Jika profile belum ada, coba buat otomatis dari auth.users
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(authUserId);
      
      if (authError || !authUser) {
        return null;
      }

      const newProfile = await createUserProfile(authUserId, authUser.email, authUser.user_metadata);
      
      if (!newProfile) {
        return null;
      }

      return newProfile;
    }

    return data;
  } catch (err) {
    console.error('Get user profile error:', err);
    return null;
  }
}

/**
 * Buat profil user secara manual (fallback jika trigger tidak jalan)
 */
async function createUserProfile(authUserId, email, metadata = {}) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        supabase_uid: authUserId,
        email: email,
        name: metadata?.name || email.split('@')[0],
        role: metadata?.role || 'admin_tu',
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create user profile:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Create user profile error:', err);
    return null;
  }
}

/**
 * Login dengan email dan password via Supabase Auth
 * Menggunakan anon key client (bukan service role) untuk autentikasi
 */
export async function signInAdmin(email, password) {
  try {
    // Gunakan anon key client untuk autentikasi (bukan service role)
    const authClient = createAuthClient();

    console.log('[AUTH] Attempting login for:', email);

    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('[AUTH] Supabase auth error:', error.message, error.status);
      // Berikan pesan error yang lebih user-friendly
      let errorMsg = error.message;
      if (error.message.includes('Invalid login credentials')) {
        errorMsg = 'Email atau password salah';
      } else if (error.message.includes('Email not confirmed')) {
        errorMsg = 'Email belum dikonfirmasi. Silakan cek inbox email Anda.';
      } else if (error.message.includes('Too many requests')) {
        errorMsg = 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.';
      }
      return { success: false, error: errorMsg, debug: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'User tidak ditemukan' };
    }

    // Cek apakah email sudah dikonfirmasi
    if (!data.user.email_confirmed_at && !data.user.confirmed_at) {
      return { success: false, error: 'Email belum dikonfirmasi. Silakan cek inbox email Anda.' };
    }

    // Cek role di tabel users
    let profile = await getUserProfile(data.user.id);

    // Jika profile tidak ada, buat otomatis
    if (!profile) {
      profile = await createUserProfile(data.user.id, data.user.email, data.user.user_metadata);
      
      if (!profile) {
        return { success: false, error: 'Gagal membuat profil pengguna. Hubungi administrator.' };
      }
    }

    if (!profile.is_active) {
      return { success: false, error: 'Akun dinonaktifkan. Hubungi administrator.' };
    }

    const allowedRoles = ['super_admin', 'kepsek', 'admin_tu', 'tim_media', 'keuangan', 'panitia_spmb', 'guru', 'walas'];
    if (!allowedRoles.includes(profile.role)) {
      return { success: false, error: 'Akun tidak memiliki akses admin.' };
    }

    return {
      success: true,
      session: data.session,
      user: {
        id: data.user.id,
        email: data.user.email,
        ...profile
      }
    };
  } catch (err) {
    console.error('Sign in error:', err);
    return { success: false, error: 'Terjadi kesalahan server. Silakan coba lagi.' };
  }
}

/**
 * Logout — revoke session
 */
export async function signOutAdmin(request) {
  const accessToken = getAccessToken(request);

  if (accessToken) {
    try {
      await supabaseAdmin.auth.admin.signOut(accessToken);
    } catch (err) {
      // Ignore errors on sign out
    }
  }

  return { success: true };
}

/**
 * Buat cookie headers untuk set session
 */
export function createSessionCookies(session) {
  const isProd = process.env.VERCEL_ENV === 'production' || !import.meta.env.DEV;
  const secureFlag = isProd ? 'Secure;' : '';
  return [
    `${COOKIE_ACCESS_TOKEN}=${session.access_token}; Path=/; HttpOnly; ${secureFlag} SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`,
    `${COOKIE_REFRESH_TOKEN}=${session.refresh_token}; Path=/; HttpOnly; ${secureFlag} SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`
  ];
}

/**
 * Buat cookie headers untuk clear session
 */
export function createLogoutCookies() {
  const isProd = process.env.VERCEL_ENV === 'production' || !import.meta.env.DEV;
  const secureFlag = isProd ? 'Secure;' : '';
  return [
    `${COOKIE_ACCESS_TOKEN}=; Path=/; HttpOnly; ${secureFlag} SameSite=Lax; Max-Age=0`,
    `${COOKIE_REFRESH_TOKEN}=; Path=/; HttpOnly; ${secureFlag} SameSite=Lax; Max-Age=0`
  ];
}

/**
 * Helper: Cek apakah user memiliki role yang diizinkan
 */
export function hasRole(userRole, allowedRoles) {
  if (!userRole) return false;
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(userRole);
}

/**
 * Helper: Untuk digunakan di API routes — cek auth dan return 401 jika tidak authenticated
 */
export async function requireAuth(request, allowedRoles = null) {
  const session = await verifySession(request);

  if (!session.authenticated) {
    return {
      authorized: false,
      response: new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized. Silakan login terlebih dahulu.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    };
  }

  if (allowedRoles && !hasRole(session.role, allowedRoles)) {
    return {
      authorized: false,
      response: new Response(JSON.stringify({
        success: false,
        error: 'Forbidden. Anda tidak memiliki akses ke resource ini.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    };
  }

  return {
    authorized: true,
    user: session.user,
    role: session.role
  };
}

/**
 * Helper: Untuk digunakan di Astro pages (frontmatter) — cek auth dan redirect jika tidak authenticated
 */
export async function checkPageAuth(Astro, allowedRoles = null) {
  const request = Astro.request;
  const session = await verifySession(request);

  if (!session.authenticated) {
    return Astro.redirect('/admin/login');
  }

  if (allowedRoles && !hasRole(session.role, allowedRoles)) {
    return Astro.redirect('/admin/login');
  }

  return {
    authorized: true,
    user: session.user,
    role: session.role,
    setCookies: session.newSession ? createSessionCookies(session.newSession) : null
  };
}

/**
 * Helper: Setup admin user (dipanggil dari API endpoint)
 * Digunakan jika trigger di Supabase tidak berjalan
 */
export async function setupAdminUser(email, password, name, role = 'admin_tu') {
  try {
    // Buat user di Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role
      }
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Gagal membuat user auth' };
    }

    // Buat profil di tabel users
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .upsert({
        supabase_uid: authData.user.id,
        email: email,
        name: name,
        role: role,
        is_active: true
      }, { onConflict: 'email' })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return { success: false, error: 'Gagal membuat profil: ' + profileError.message };
    }

    return {
      success: true,
      user: {
        id: authData.user.id,
        email,
        name,
        role
      }
    };
  } catch (err) {
    console.error('Setup admin error:', err);
    return { success: false, error: 'Terjadi kesalahan server' };
  }
}

export default {
  parseCookies,
  getAccessToken,
  getRefreshToken,
  verifySession,
  signInAdmin,
  signOutAdmin,
  createSessionCookies,
  createLogoutCookies,
  hasRole,
  requireAuth,
  checkPageAuth,
  setupAdminUser
};