/**
 * EMAIL SERVICE — Kirim email verifikasi dengan template HTML premium
 * 
 * Menggunakan Nodemailer dengan SMTP.
 * Konfigurasikan SMTP di .env.local:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

import nodemailer from "nodemailer";

// ═══════════════════════════════════════
// SMTP TRANSPORTER
// ═══════════════════════════════════════

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.error("⚠️ SMTP belum dikonfigurasi. Set SMTP_HOST, SMTP_USER, SMTP_PASS di .env.local");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

// ═══════════════════════════════════════
// HTML EMAIL TEMPLATE — Verifikasi Akun
// ═══════════════════════════════════════

function generateVerificationEmailHTML(nama, otpCode) {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Akun — Nusantara Batik Chain</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  
  <!-- Outer Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f172a;">
    <tr>
      <td style="padding: 40px 20px;">
        
        <!-- Inner Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #1a1f3a 100%); border-radius: 24px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden;">
          
          <!-- Header with batik pattern accent -->
          <tr>
            <td style="padding: 0;">
              <div style="height: 6px; background: linear-gradient(90deg, #f59e0b, #d97706, #b45309, #d97706, #f59e0b); background-size: 200% 100%;"></div>
            </td>
          </tr>

          <!-- Logo & Brand -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 16px; line-height: 64px; font-size: 32px; margin-bottom: 16px;">
                🎨
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                Nusantara Batik Chain
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase;">
                Verifikasi Akun
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px;">
              <p style="margin: 0; font-size: 15px; color: #e2e8f0; line-height: 1.6;">
                Halo <strong style="color: #fbbf24;">${nama}</strong>,
              </p>
              <p style="margin: 12px 0 0 0; font-size: 14px; color: #94a3b8; line-height: 1.7;">
                Terima kasih telah mendaftar di Nusantara Batik Chain. Gunakan kode verifikasi di bawah ini untuk menyelesaikan pendaftaran Anda:
              </p>
            </td>
          </tr>

          <!-- OTP Code Box -->
          <tr>
            <td style="padding: 32px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%); border: 2px solid rgba(16, 185, 129, 0.25); border-radius: 16px; padding: 28px; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 11px; color: #6ee7b7; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">
                      Kode Verifikasi
                    </p>
                    <p style="margin: 0; font-size: 42px; font-weight: 800; color: #10b981; letter-spacing: 12px; font-family: 'Courier New', monospace;">
                      ${otpCode}
                    </p>
                    <p style="margin: 12px 0 0 0; font-size: 12px; color: #6ee7b7; opacity: 0.7;">
                      Berlaku selama <strong>10 menit</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.15); border-radius: 12px; padding: 16px;">
                    <p style="margin: 0; font-size: 12px; color: #fbbf24; line-height: 1.6;">
                      ⚠️ <strong>Jangan bagikan kode ini kepada siapapun.</strong> Tim Nusantara Batik Chain tidak pernah meminta kode verifikasi Anda.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Info -->
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.7;">
                Jika Anda tidak melakukan pendaftaran ini, abaikan email ini. Tidak ada perubahan yang akan dilakukan pada akun Anda.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 32px 40px 0 40px;">
              <div style="height: 1px; background: rgba(255,255,255,0.06);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px 40px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Layanan Verifikasi Otomatis Nusantara Batik Chain
              </p>
              <p style="margin: 8px 0 0 0; font-size: 10px; color: #334155; letter-spacing: 1px;">
                © ${new Date().getFullYear()} NUSANTARA BATIK CHAIN
              </p>
            </td>
          </tr>

          <!-- Bottom accent -->
          <tr>
            <td style="padding: 0;">
              <div style="height: 4px; background: linear-gradient(90deg, #10b981, #14b8a6, #06b6d4, #14b8a6, #10b981); background-size: 200% 100%;"></div>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>
`;
}

// ═══════════════════════════════════════
// PLAIN TEXT FALLBACK
// ═══════════════════════════════════════

function generateVerificationEmailText(nama, otpCode) {
  return `
NUSANTARA BATIK CHAIN — Verifikasi Akun
========================================

Halo ${nama},

Terima kasih telah mendaftar di Nusantara Batik Chain.

Kode Verifikasi Anda:

    ${otpCode}

Kode ini berlaku selama 10 menit.

Jangan bagikan kode ini kepada siapapun.
Tim Nusantara Batik Chain tidak pernah meminta kode verifikasi Anda.

Jika Anda tidak melakukan pendaftaran ini, abaikan email ini.

—
© ${new Date().getFullYear()} Nusantara Batik Chain
Layanan Verifikasi Otomatis
`;
}

// ═══════════════════════════════════════
// SEND VERIFICATION EMAIL
// ═══════════════════════════════════════

export async function sendVerificationEmail(nama, email, otpCode) {
  const transporter = createTransporter();

  if (!transporter) {
    // Fallback: log OTP ke console jika SMTP belum dikonfigurasi
    console.log("═══════════════════════════════════════");
    console.log(`📧 VERIFIKASI EMAIL (SMTP belum aktif)`);
    console.log(`   Nama  : ${nama}`);
    console.log(`   Email : ${email}`);
    console.log(`   OTP   : ${otpCode}`);
    console.log("═══════════════════════════════════════");
    return { success: true, fallback: true };
  }

  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  try {
    await transporter.sendMail({
      from: `"Nusantara Batik Chain" <${fromAddress}>`,
      to: email,
      subject: `Kode Verifikasi Nusantara Batik Chain: ${otpCode}`,
      text: generateVerificationEmailText(nama, otpCode),
      html: generateVerificationEmailHTML(nama, otpCode),
    });

    console.log(`✅ Email verifikasi terkirim ke: ${email}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Gagal kirim email:", error.message);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════
// PASSWORD RESET EMAIL TEMPLATES & SENDER
// ═══════════════════════════════════════

function generateResetEmailHTML(nama, otpCode) {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password — Nusantara Batik Chain</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  
  <!-- Outer Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f172a;">
    <tr>
      <td style="padding: 40px 20px;">
        
        <!-- Inner Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #1a1f3a 100%); border-radius: 24px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden;">
          
          <!-- Header with batik pattern accent -->
          <tr>
            <td style="padding: 0;">
              <div style="height: 6px; background: linear-gradient(90deg, #ef4444, #f59e0b, #ef4444); background-size: 200% 100%;"></div>
            </td>
          </tr>

          <!-- Logo & Brand -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #ef4444, #f59e0b); border-radius: 16px; line-height: 64px; font-size: 32px; margin-bottom: 16px;">
                🔑
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                Nusantara Batik Chain
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase;">
                Reset Password
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px;">
              <p style="margin: 0; font-size: 15px; color: #e2e8f0; line-height: 1.6;">
                Halo <strong style="color: #fbbf24;">${nama}</strong>,
              </p>
              <p style="margin: 12px 0 0 0; font-size: 14px; color: #94a3b8; line-height: 1.7;">
                Kami menerima permintaan untuk mereset password akun Anda di Nusantara Batik Chain. Gunakan kode verifikasi reset di bawah ini untuk melanjutkan:
              </p>
            </td>
          </tr>

          <!-- OTP Code Box -->
          <tr>
            <td style="padding: 32px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%); border: 2px solid rgba(239, 68, 68, 0.25); border-radius: 16px; padding: 28px; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 11px; color: #fca5a5; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">
                      Kode Reset Password
                    </p>
                    <p style="margin: 0; font-size: 42px; font-weight: 800; color: #ef4444; letter-spacing: 12px; font-family: 'Courier New', monospace;">
                      ${otpCode}
                    </p>
                    <p style="margin: 12px 0 0 0; font-size: 12px; color: #fca5a5; opacity: 0.7;">
                      Berlaku selama <strong>10 menit</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.15); border-radius: 12px; padding: 16px;">
                    <p style="margin: 0; font-size: 12px; color: #fbbf24; line-height: 1.6;">
                      ⚠️ <strong>Keamanan Akun:</strong> Jika Anda tidak merasa meminta reset password, abaikan email ini dan pastikan password Anda saat ini tetap aman. Jangan bagikan kode ini kepada siapa pun.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 32px 40px 0 40px;">
              <div style="height: 1px; background: rgba(255,255,255,0.06);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px 40px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Layanan Verifikasi Otomatis Nusantara Batik Chain
              </p>
              <p style="margin: 8px 0 0 0; font-size: 10px; color: #334155; letter-spacing: 1px;">
                © ${new Date().getFullYear()} NUSANTARA BATIK CHAIN
              </p>
            </td>
          </tr>

          <!-- Bottom accent -->
          <tr>
            <td style="padding: 0;">
              <div style="height: 4px; background: linear-gradient(90deg, #ef4444, #f59e0b, #ef4444); background-size: 200% 100%;"></div>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>
`;
}

function generateResetEmailText(nama, otpCode) {
  return `
NUSANTARA BATIK CHAIN — Reset Password
=======================================

Halo ${nama},

Kami menerima permintaan untuk mereset password akun Anda di Nusantara Batik Chain.
Gunakan kode di bawah ini untuk melanjutkan proses reset password:

    ${otpCode}

Kode ini berlaku selama 10 menit.

Jika Anda tidak melakukan permintaan ini, silakan abaikan email ini.
Jangan bagikan kode ini kepada siapapun demi keamanan akun Anda.

—
© ${new Date().getFullYear()} Nusantara Batik Chain
Layanan Verifikasi Otomatis
`;
}

export async function sendResetPasswordEmail(nama, email, otpCode) {
  const transporter = createTransporter();

  if (!transporter) {
    // Fallback: log OTP ke console jika SMTP belum dikonfigurasi
    console.log("═══════════════════════════════════════");
    console.log(`📧 RESET PASSWORD EMAIL (SMTP belum aktif)`);
    console.log(`   Nama  : ${nama}`);
    console.log(`   Email : ${email}`);
    console.log(`   OTP   : ${otpCode}`);
    console.log("═══════════════════════════════════════");
    return { success: true, fallback: true };
  }

  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  try {
    await transporter.sendMail({
      from: `"Nusantara Batik Chain" <${fromAddress}>`,
      to: email,
      subject: `Kode Reset Password Nusantara Batik Chain: ${otpCode}`,
      text: generateResetEmailText(nama, otpCode),
      html: generateResetEmailHTML(nama, otpCode),
    });

    console.log(`✅ Email reset password terkirim ke: ${email}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Gagal kirim email reset password:", error.message);
    return { success: false, error: error.message };
  }
}
