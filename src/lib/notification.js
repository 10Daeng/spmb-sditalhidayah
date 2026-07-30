/**
 * Notification Service
 * Mendukung pengiriman notifikasi via Email dan WhatsApp
 * 
 * Providers yang didukung:
 * - WhatsApp: Fonnte, Wablas, atau custom
 * - Email: Resend, SendGrid, atau SMTP
 */

// ============================================
// CONFIGURATION
// ============================================

const config = {
  // WhatsApp Provider (pilih salah satu)
  whatsapp: {
    provider: 'fonnte', // 'fonnte' | 'wablas' | 'custom'
    fonnte: {
      apiUrl: 'https://api.fonnte.com/send',
      token: import.meta.env.FONNTE_TOKEN || process.env.FONNTE_TOKEN
    },
    wablas: {
      apiUrl: 'https://pati.wablas.com/api/send-message',
      token: import.meta.env.WABLAS_TOKEN || process.env.WABLAS_TOKEN
    }
  },
  
  // Email Provider (pilih salah satu)
  email: {
    provider: 'resend', // 'resend' | 'sendgrid' | 'smtp'
    resend: {
      apiKey: import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY,
      fromEmail: 'SPMB SDIT Al-Hidayah <ppdb@sditalhidayah.sch.id>'
    },
    sendgrid: {
      apiKey: import.meta.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY,
      fromEmail: 'ppdb@sditalhidayah.sch.id'
    }
  },
  
  // School Info
  school: {
    name: 'SDIT Al-Hidayah Sumenep',
    phone: '0812-3456-7890',
    website: 'https://sditalhidayah.sch.id'
  }
};

// ============================================
// WHATSAPP NOTIFICATION
// ============================================

/**
 * Send WhatsApp message via Fonnte
 */
async function sendFonnte(phone, message) {
  const token = config.whatsapp.fonnte.token;
  
  if (!token) {
    console.warn('⚠️ FONNTE_TOKEN not configured');
    return { success: false, error: 'WhatsApp not configured' };
  }
  
  try {
    const response = await fetch(config.whatsapp.fonnte.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: normalizePhone(phone),
        message: message,
        countryCode: '62'
      })
    });
    
    const result = await response.json();
    
    if (result.status) {
      console.log('✅ WhatsApp sent via Fonnte:', phone);
      return { success: true, messageId: result.id };
    } else {
      console.error('❌ Fonnte error:', result);
      return { success: false, error: result.reason || 'Failed to send' };
    }
  } catch (error) {
    console.error('❌ Fonnte exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send WhatsApp message via Wablas
 */
async function sendWablas(phone, message) {
  const token = config.whatsapp.wablas.token;
  
  if (!token) {
    console.warn('⚠️ WABLAS_TOKEN not configured');
    return { success: false, error: 'WhatsApp not configured' };
  }
  
  try {
    const response = await fetch(config.whatsapp.wablas.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: normalizePhone(phone),
        message: message
      })
    });
    
    const result = await response.json();
    
    if (result.status === true) {
      console.log('✅ WhatsApp sent via Wablas:', phone);
      return { success: true, messageId: result.data?.id };
    } else {
      console.error('❌ Wablas error:', result);
      return { success: false, error: result.message || 'Failed to send' };
    }
  } catch (error) {
    console.error('❌ Wablas exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send WhatsApp message (auto-select provider)
 */
export async function sendWhatsApp(phone, message) {
  if (!phone) {
    return { success: false, error: 'Phone number required' };
  }
  
  const provider = config.whatsapp.provider;
  
  switch (provider) {
    case 'fonnte':
      return sendFonnte(phone, message);
    case 'wablas':
      return sendWablas(phone, message);
    default:
      console.warn('⚠️ Unknown WhatsApp provider:', provider);
      return { success: false, error: 'Unknown provider' };
  }
}

// ============================================
// EMAIL NOTIFICATION
// ============================================

/**
 * Send email via Resend
 */
async function sendResend(to, subject, htmlContent, textContent) {
  const apiKey = config.email.resend.apiKey;
  
  if (!apiKey) {
    console.warn('⚠️ RESEND_API_KEY not configured');
    return { success: false, error: 'Email not configured' };
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: config.email.resend.fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: htmlContent,
        text: textContent
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Email sent via Resend:', to);
      return { success: true, messageId: result.id };
    } else {
      console.error('❌ Resend error:', result);
      return { success: false, error: result.message || 'Failed to send' };
    }
  } catch (error) {
    console.error('❌ Resend exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email via SendGrid
 */
async function sendSendGrid(to, subject, htmlContent, textContent) {
  const apiKey = config.email.sendgrid.apiKey;
  
  if (!apiKey) {
    console.warn('⚠️ SENDGRID_API_KEY not configured');
    return { success: false, error: 'Email not configured' };
  }
  
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: Array.isArray(to) ? to.map(e => ({ email: e })) : [{ email: to }]
        }],
        from: { email: config.email.sendgrid.fromEmail },
        subject: subject,
        content: [
          { type: 'text/plain', value: textContent },
          { type: 'text/html', value: htmlContent }
        ]
      })
    });
    
    if (response.ok || response.status === 202) {
      console.log('✅ Email sent via SendGrid:', to);
      return { success: true };
    } else {
      const result = await response.json();
      console.error('❌ SendGrid error:', result);
      return { success: false, error: result.errors?.[0]?.message || 'Failed to send' };
    }
  } catch (error) {
    console.error('❌ SendGrid exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email (auto-select provider)
 */
export async function sendEmail(to, subject, htmlContent, textContent = '') {
  if (!to) {
    return { success: false, error: 'Email address required' };
  }
  
  const provider = config.email.provider;
  const text = textContent || stripHtml(htmlContent);
  
  switch (provider) {
    case 'resend':
      return sendResend(to, subject, htmlContent, text);
    case 'sendgrid':
      return sendSendGrid(to, subject, htmlContent, text);
    default:
      console.warn('⚠️ Unknown email provider:', provider);
      return { success: false, error: 'Unknown provider' };
  }
}

// ============================================
// COMBINED NOTIFICATION
// ============================================

/**
 * Send notification via both Email and WhatsApp
 */
export async function sendNotification({ 
  phone, 
  email, 
  whatsappMessage, 
  emailSubject, 
  emailHtml,
  emailText 
}) {
  const results = {
    whatsapp: null,
    email: null,
    success: false
  };
  
  // Send WhatsApp
  if (phone && whatsappMessage) {
    results.whatsapp = await sendWhatsApp(phone, whatsappMessage);
  }
  
  // Send Email
  if (email && emailSubject && emailHtml) {
    results.email = await sendEmail(email, emailSubject, emailHtml, emailText);
  }
  
  // Overall success if at least one succeeded
  results.success = (results.whatsapp?.success || results.email?.success) || false;
  
  return results;
}

// ============================================
// MESSAGE TEMPLATES
// ============================================

/**
 * Generate registration confirmation messages
 */
export function generateRegistrationConfirmation(data) {
  const { studentName, registrationNumber, parentName } = data;
  
  const whatsappMessage = `*KONFIRMASI INDENT*
━━━━━━━━━━━━━━━━━━━━

Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu *${parentName}*,

Indent SPMB untuk ananda *${studentName}* telah kami terima.

📋 *No. Registrasi:* ${registrationNumber}

Status: ⏳ MENUNGGU VERIFIKASI

Berkas akan diverifikasi oleh panitia dalam waktu 1x24 jam. Kami akan menghubungi Anda setelah proses verifikasi selesai.

Terima kasih telah memilih ${config.school.name}.

Wassalamu'alaikum Wr. Wb.

---
📞 Panitia SPMB: ${config.school.phone}
🌐 ${config.school.website}`;

  const emailSubject = `[SPMB] Konfirmasi Indent - ${studentName}`;
  
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">🎓 ${config.school.name}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Penerimaan Peserta Didik Baru</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="color: #374151; line-height: 1.6;">
        Assalamu'alaikum Wr. Wb.<br><br>
        Yth. Bapak/Ibu <strong>${parentName}</strong>,
      </p>
      
      <p style="color: #374151; line-height: 1.6;">
        Indent SPMB untuk ananda <strong>${studentName}</strong> telah kami terima dengan baik.
      </p>
      
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #1e40af;">
          <strong>📋 Nomor Registrasi:</strong><br>
          <span style="font-size: 20px; font-weight: bold; font-family: monospace;">${registrationNumber}</span>
        </p>
      </div>
      
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #92400e;">
          <strong>⏳ Status:</strong> MENUNGGU VERIFIKASI<br>
          <small>Berkas akan diverifikasi dalam 1x24 jam.</small>
        </p>
      </div>
      
      <p style="color: #374151; line-height: 1.6;">
        Simpan nomor registrasi Anda dengan baik. Kami akan menghubungi Anda setelah proses verifikasi selesai.
      </p>
      
      <p style="color: #374151; line-height: 1.6;">
        Wassalamu'alaikum Wr. Wb.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        ${config.school.name}<br>
        📞 ${config.school.phone} | 🌐 <a href="${config.school.website}" style="color: #3b82f6;">${config.school.website}</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  return { whatsappMessage, emailSubject, emailHtml };
}

/**
 * Generate verification approved messages
 */
export function generateVerificationApproved(data) {
  const { studentName, registrationNumber, parentName, activationUrl } = data;
  
  const whatsappMessage = `*INDENT DISETUJUI* ✅
━━━━━━━━━━━━━━━━━━━━

Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu *${parentName}*,

Alhamdulillah, Indent ananda *${studentName}* telah *DIVERIFIKASI* dan *DISETUJUI*.

📋 *No. Registrasi:* ${registrationNumber}

*Langkah Selanjutnya:*
1. Lengkapi formulir data siswa
2. Upload dokumen yang diperlukan
3. Tunggu jadwal asesmen/tes

${activationUrl ? `🔗 *Link Aktivasi:*\n${activationUrl}` : ''}

Terima kasih.

Wassalamu'alaikum Wr. Wb.

---
📞 Panitia: ${config.school.phone}`;

  const emailSubject = `[SPMB] ✅ Indent Disetujui - ${studentName}`;
  
  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">✅ Indent Disetujui!</h1>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px;">
      <p>Yth. Bapak/Ibu <strong>${parentName}</strong>,</p>
      <p>Indent ananda <strong>${studentName}</strong> telah <strong>DIVERIFIKASI</strong> dan <strong>DISETUJUI</strong>.</p>
      
      <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px 20px; margin: 20px 0;">
        <p style="margin: 0;"><strong>📋 No. Registrasi:</strong> ${registrationNumber}</p>
      </div>
      
      ${activationUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${activationUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Lengkapi Data Sekarang →
        </a>
      </div>
      ` : ''}
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        ${config.school.name} | ${config.school.phone}
      </p>
    </div>
  </div>
</body>
</html>`;

  return { whatsappMessage, emailSubject, emailHtml };
}

/**
 * Generate rejection messages
 */
export function generateRejection(data) {
  const { studentName, registrationNumber, parentName, reason } = data;
  
  const whatsappMessage = `*PEMBERITAHUAN INDENT*
━━━━━━━━━━━━━━━━━━━━

Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu *${parentName}*,

Mohon maaf, Indent ananda *${studentName}* belum dapat kami proses lebih lanjut.

📋 *No. Registrasi:* ${registrationNumber}

*Alasan:*
${reason || 'Silakan hubungi panitia untuk informasi lebih lanjut.'}

Untuk informasi lebih lanjut, silakan hubungi panitia SPMB.

Wassalamu'alaikum Wr. Wb.

---
📞 Panitia: ${config.school.phone}`;

  const emailSubject = `[SPMB] Pemberitahuan Indent - ${studentName}`;
  
  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #dc2626; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Pemberitahuan Indent</h1>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px;">
      <p>Yth. Bapak/Ibu <strong>${parentName}</strong>,</p>
      <p>Mohon maaf, Indent ananda <strong>${studentName}</strong> belum dapat kami proses lebih lanjut.</p>
      
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px 20px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Alasan:</strong><br>${reason || 'Silakan hubungi panitia untuk informasi lebih lanjut.'}</p>
      </div>
      
      <p>Untuk informasi lebih lanjut, silakan hubungi panitia SPMB di ${config.school.phone}.</p>
    </div>
  </div>
</body>
</html>`;

  return { whatsappMessage, emailSubject, emailHtml };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Normalize phone number to Indonesian format
 */
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.toString().replace(/\D/g, '');
  
  // Convert 08xx to 628xx
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.slice(1);
  }
  // Ensure 62 prefix
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  
  return cleaned;
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export default {
  sendWhatsApp,
  sendEmail,
  sendNotification,
  generateRegistrationConfirmation,
  generateVerificationApproved,
  generateRejection,
  config
};
