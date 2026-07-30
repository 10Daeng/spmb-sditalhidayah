/**
 * Rate Limiting Middleware
 * Terinspirasi dari spmb-frontend untuk mencegah spam dan abuse
 */

// In-memory storage untuk rate limiting
const rateLimitsByIP = new Map();
const rateLimitsByPhone = new Map();
const rateLimitsByEmail = new Map();

// Cleanup interval (setiap 10 menit)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    
    // Clean IP limits
    for (const [key, attempts] of rateLimitsByIP.entries()) {
      const recent = attempts.filter(time => now - time < ONE_HOUR);
      if (recent.length === 0) {
        rateLimitsByIP.delete(key);
      } else {
        rateLimitsByIP.set(key, recent);
      }
    }
    
    // Clean Phone limits
    for (const [key, attempts] of rateLimitsByPhone.entries()) {
      const recent = attempts.filter(time => now - time < ONE_HOUR);
      if (recent.length === 0) {
        rateLimitsByPhone.delete(key);
      } else {
        rateLimitsByPhone.set(key, recent);
      }
    }
    
    // Clean Email limits
    for (const [key, attempts] of rateLimitsByEmail.entries()) {
      const recent = attempts.filter(time => now - time < ONE_HOUR);
      if (recent.length === 0) {
        rateLimitsByEmail.delete(key);
      } else {
        rateLimitsByEmail.set(key, recent);
      }
    }
  }, 10 * 60 * 1000);
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') || // Cloudflare
    'unknown'
  );
}

/**
 * Check rate limit by IP
 * Default: 20 requests per hour (lebih longgar untuk shared IP)
 */
export function checkIPRateLimit(ip, options = {}) {
  const { maxAttempts = 20, windowMs = 60 * 60 * 1000 } = options;
  
  if (!ip || ip === 'unknown') return { allowed: true };
  
  const now = Date.now();
  const attempts = rateLimitsByIP.get(ip) || [];
  const recentAttempts = attempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...recentAttempts);
    const resetTime = new Date(oldestAttempt + windowMs);
    
    return {
      allowed: false,
      error: `Terlalu banyak permintaan dari jaringan Anda. Coba lagi setelah ${resetTime.toLocaleTimeString('id-ID')}.`,
      resetAt: resetTime,
      remaining: 0
    };
  }
  
  recentAttempts.push(now);
  rateLimitsByIP.set(ip, recentAttempts);
  
  return { 
    allowed: true, 
    remaining: maxAttempts - recentAttempts.length,
    attempts: recentAttempts.length
  };
}

/**
 * Check rate limit by Phone Number
 * Default: 5 requests per hour (lebih ketat untuk mencegah spam)
 */
export function checkPhoneRateLimit(phone, options = {}) {
  const { maxAttempts = 5, windowMs = 60 * 60 * 1000 } = options;
  
  if (!phone) return { allowed: true };
  
  // Normalize phone number
  const normalizedPhone = phone.toString().replace(/\D/g, '');
  
  const now = Date.now();
  const attempts = rateLimitsByPhone.get(normalizedPhone) || [];
  const recentAttempts = attempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...recentAttempts);
    const resetTime = new Date(oldestAttempt + windowMs);
    
    return {
      allowed: false,
      error: `Nomor HP ${phone} sudah terlalu sering digunakan. Coba lagi setelah ${resetTime.toLocaleTimeString('id-ID')}.`,
      resetAt: resetTime,
      remaining: 0
    };
  }
  
  recentAttempts.push(now);
  rateLimitsByPhone.set(normalizedPhone, recentAttempts);
  
  return { 
    allowed: true, 
    remaining: maxAttempts - recentAttempts.length,
    attempts: recentAttempts.length
  };
}

/**
 * Check rate limit by Email
 * Default: 3 requests per hour
 */
export function checkEmailRateLimit(email, options = {}) {
  const { maxAttempts = 3, windowMs = 60 * 60 * 1000 } = options;
  
  if (!email) return { allowed: true };
  
  const normalizedEmail = email.toLowerCase().trim();
  
  const now = Date.now();
  const attempts = rateLimitsByEmail.get(normalizedEmail) || [];
  const recentAttempts = attempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    return {
      allowed: false,
      error: `Email ini sudah terlalu sering digunakan. Coba lagi nanti.`,
      remaining: 0
    };
  }
  
  recentAttempts.push(now);
  rateLimitsByEmail.set(normalizedEmail, recentAttempts);
  
  return { 
    allowed: true, 
    remaining: maxAttempts - recentAttempts.length
  };
}

/**
 * Login Rate Limiter
 * Default: 10 attempts per 15 minutes per IP
 */
export function checkLoginRateLimit(ip, options = {}) {
  const { maxAttempts = 10, windowMs = 15 * 60 * 1000 } = options;
  return checkIPRateLimit(ip, { maxAttempts, windowMs });
}

/**
 * Registration Rate Limiter - Combined check
 */
export function checkRegistrationRateLimit(request, data = {}) {
  const ip = getClientIP(request);
  const { phone, email } = data;
  
  // Check IP first (most permissive)
  const ipCheck = checkIPRateLimit(ip, { maxAttempts: 20 });
  if (!ipCheck.allowed) {
    return { allowed: false, error: ipCheck.error, type: 'ip' };
  }
  
  // Check Phone (more restrictive)
  if (phone) {
    const phoneCheck = checkPhoneRateLimit(phone, { maxAttempts: 5 });
    if (!phoneCheck.allowed) {
      return { allowed: false, error: phoneCheck.error, type: 'phone' };
    }
  }
  
  // Check Email (most restrictive)
  if (email) {
    const emailCheck = checkEmailRateLimit(email, { maxAttempts: 3 });
    if (!emailCheck.allowed) {
      return { allowed: false, error: emailCheck.error, type: 'email' };
    }
  }
  
  return { allowed: true };
}

/**
 * Rate Limit Response Helper
 */
export function rateLimitResponse(error, retryAfter = 900) {
  return new Response(JSON.stringify({ 
    success: false, 
    error,
    retryAfter 
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': retryAfter.toString()
    }
  });
}

/**
 * Middleware wrapper for rate limiting
 */
export function withRateLimit(handler, options = {}) {
  const {
    type = 'ip', // 'ip', 'phone', 'email', 'registration', 'login'
    extractData = () => ({})
  } = options;
  
  return async (context) => {
    const { request } = context;
    const ip = getClientIP(request);
    
    let result;
    
    switch (type) {
      case 'login':
        result = checkLoginRateLimit(ip);
        break;
      case 'registration':
        const data = extractData ? await extractData(request) : {};
        result = checkRegistrationRateLimit(request, data);
        break;
      case 'phone':
        const phoneData = extractData ? await extractData(request) : {};
        result = checkPhoneRateLimit(phoneData.phone);
        break;
      default:
        result = checkIPRateLimit(ip);
    }
    
    if (!result.allowed) {
      return rateLimitResponse(result.error);
    }
    
    return handler(context);
  };
}

export default {
  getClientIP,
  checkIPRateLimit,
  checkPhoneRateLimit,
  checkEmailRateLimit,
  checkLoginRateLimit,
  checkRegistrationRateLimit,
  rateLimitResponse,
  withRateLimit
};
