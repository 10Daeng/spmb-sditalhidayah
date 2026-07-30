/**
 * Admin Authentication API
 * POST /api/auth/login - Login admin
 * POST /api/auth/logout - Logout admin
 * GET /api/auth/session - Check session
 */

export const prerender = false;

import { signInAdmin, signOutAdmin, createSessionCookies, createLogoutCookies, verifySession } from '../../../lib/auth';
import { getClientIP, checkIPRateLimit, rateLimitResponse } from '../../../lib/rateLimit';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { action } = body;

    // ========================
    // LOGIN
    // ========================
    if (action === 'login') {
      const { email, password } = body;

      if (!email || !password) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Email dan password wajib diisi'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Rate limiting: 5 attempts per IP per 15 minutes
      const clientIP = getClientIP(request);
      const rateCheck = checkIPRateLimit(clientIP, { maxAttempts: 5, windowMs: 15 * 60 * 1000 });
      if (!rateCheck.allowed) {
        return rateLimitResponse(rateCheck.error, 900);
      }

      const result = await signInAdmin(email, password);

      if (!result.success) {
        console.error('Login failed:', result.error);
        return new Response(JSON.stringify({
          success: false,
          error: result.error,
          debug: result.debug || undefined
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const cookies = createSessionCookies(result.session);

      return new Response(JSON.stringify({
        success: true,
        message: 'Login berhasil',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role
        }
      }), {
        status: 200,
        headers: [
          ['Content-Type', 'application/json'],
          ['Set-Cookie', cookies[0]],
          ['Set-Cookie', cookies[1]]
        ]
      });
    }

    // ========================
    // LOGOUT
    // ========================
    if (action === 'logout') {
      await signOutAdmin(request);
      const cookies = createLogoutCookies();

      return new Response(JSON.stringify({
        success: true,
        message: 'Logout berhasil'
      }), {
        status: 200,
        headers: [
          ['Content-Type', 'application/json'],
          ['Set-Cookie', cookies[0]],
          ['Set-Cookie', cookies[1]]
        ]
      });
    }

    // ========================
    // VALIDATE SESSION
    // ========================
    if (action === 'validate') {
      const session = await verifySession(request);

      if (!session.authenticated) {
        return new Response(JSON.stringify({
          authenticated: false,
          error: 'Session tidak valid atau sudah expired'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid action'
    }), { status: 400 });

  } catch (err) {
    console.error('Auth API error:', err);
    return new Response(JSON.stringify({
      success: false,
      error: 'Terjadi kesalahan server'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * GET - Check current session status
 */
export async function GET({ request }) {
  try {
    const session = await verifySession(request);

    return new Response(JSON.stringify({
      authenticated: session.authenticated,
      user: session.authenticated ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role
      } : null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      authenticated: false,
      error: err.message
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}