import { defineMiddleware } from 'astro:middleware';
import { verifySession, createSessionCookies, COOKIE_ACCESS_TOKEN, COOKIE_REFRESH_TOKEN } from './lib/auth';

const PUBLIC_PATHS = [
  '/',
  '/spmb',
  '/berita',
  '/api/registration',
  '/api/dashboard',
  '/api/exam-card',
  '/api/auth',
];

const ADMIN_LOGIN_PATH = '/admin/login';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Skip auth check untuk public paths
  const isPublicPath = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith('/api/registration') || pathname.startsWith('/api/auth'));
  const isLoginPath = pathname === ADMIN_LOGIN_PATH;
  const isAdminPath = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');

  // Halaman publik tidak perlu auth
  if (isPublicPath && !isAdminApi) {
    return next();
  }

  // Admin login page — redirect ke dashboard jika sudah authenticated
  if (isLoginPath) {
    const session = await verifySession(context.request);
    const adminRoles = ['super_admin', 'kepsek', 'admin_tu', 'tim_media', 'keuangan', 'panitia_spmb', 'guru', 'walas'];
    if (session.authenticated && adminRoles.includes(session.role)) {
      return context.redirect('/admin/dashboard');
    }
    return next();
  }

  // Admin API routes — return 401 JSON jika tidak authenticated
  if (isAdminApi) {
    const session = await verifySession(context.request);

    if (!session.authenticated) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized. Silakan login terlebih dahulu.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Set user info di locals untuk dipakai di API routes
    context.locals.user = session.user;
    context.locals.role = session.role;

    // Jika session di-refresh, set cookies baru
    if (session.newSession) {
      const response = await next();
      const cookies = createSessionCookies(session.newSession);
      cookies.forEach(cookie => {
        response.headers.append('Set-Cookie', cookie);
      });
      return response;
    }

    return next();
  }

  // Admin pages — redirect ke login jika tidak authenticated
  if (isAdminPath) {
    const session = await verifySession(context.request);

    if (!session.authenticated) {
      return context.redirect(ADMIN_LOGIN_PATH);
    }

    const adminRoles = ['super_admin', 'kepsek', 'admin_tu', 'tim_media', 'keuangan', 'panitia_spmb', 'guru', 'walas'];
    if (!adminRoles.includes(session.role)) {
      return context.redirect(ADMIN_LOGIN_PATH);
    }

    // Set user info di locals
    context.locals.user = session.user;
    context.locals.role = session.role;

    // Jika session di-refresh, set cookies baru
    if (session.newSession) {
      const response = await next();
      const cookies = createSessionCookies(session.newSession);
      cookies.forEach(cookie => {
        response.headers.append('Set-Cookie', cookie);
      });
      return response;
    }

    return next();
  }

  return next();
});