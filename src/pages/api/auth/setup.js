/**
 * Setup endpoint — HANYA untuk initial setup
 * Buat admin user pertama kali
 * HAPUS endpoint ini setelah setup selesai di production!
 */

export const prerender = false;

import { setupAdminUser } from '../../../lib/auth.js';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { email, password, name, setup_key } = body;

    // Safety check — hanya bisa diakses dengan setup key yang cocok
    const expectedKey = import.meta.env.ADMIN_SETUP_KEY || 'sist-v2-initial-setup-2026';

    if (setup_key !== expectedKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Setup key tidak valid'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!email || !password || !name) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email, password, dan nama wajib diisi'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Password minimal 8 karakter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await setupAdminUser(email, password, name, 'admin_tu');

    if (!result.success) {
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Admin user berhasil dibuat! Anda sekarang bisa login.',
      user: result.user
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Setup error:', err);
    return new Response(JSON.stringify({
      success: false,
      error: 'Terjadi kesalahan server'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}