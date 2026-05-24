/**
 * lib/email.js
 * Tiện ích gửi email dùng chung:
 *  - Ưu tiên sử dụng SMTP (Nodemailer) với cấu hình máy chủ của host.
 *  - Nếu SMTP thất bại, tự động chuyển sang Resend làm dự phòng.
 */

import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// ─────────────────────────────────────────────
// Cấu hình SMTP (đọc từ biến môi trường)
// ─────────────────────────────────────────────
const smtpConfig = {
  host: process.env.SMTP_HOST || 'mail.pishare.site',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: (process.env.SMTP_SECURE || 'true') === 'true', // true → SSL/TLS (port 465)
  auth: {
    user: process.env.SMTP_USER || 'noreply@pishare.site',
    pass: process.env.SMTP_PASS || '',
  },
  // Thời gian chờ kết nối (ms) – tránh treo lâu khi host không phản hồi
  connectionTimeout: 8000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
};

// ─────────────────────────────────────────────
// Khởi tạo Resend (dùng làm backup)
// ─────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');

/**
 * Gửi email.
 *
 * @param {{ from?: string, to: string, subject: string, html: string }} options
 * @returns {Promise<{ success: boolean, provider: 'smtp' | 'resend', error?: any }>}
 */
export async function sendEmail({ from, to, subject, html }) {
  const defaultFrom = `PiShare.site <${smtpConfig.auth.user}>`;
  const senderAddress = from || defaultFrom;

  // ── 1. Thử SMTP trước ────────────────────────
  try {
    const transporter = nodemailer.createTransport(smtpConfig);
    await transporter.sendMail({
      from: senderAddress,
      to,
      subject,
      html,
    });
    console.log(`✔ [SMTP] Email gửi thành công tới: ${to}`);
    return { success: true, provider: 'smtp' };
  } catch (smtpErr) {
    console.warn(`⚠ [SMTP] Gửi email thất bại, chuyển sang Resend. Lỗi: ${smtpErr.message}`);
  }

  // ── 2. Fallback: Resend ───────────────────────
  try {
    const { error: resendErr } = await resend.emails.send({
      from: senderAddress,
      to,
      subject,
      html,
    });
    if (resendErr) {
      console.error(`✘ [Resend] Gửi email thất bại:`, resendErr);
      return { success: false, provider: 'resend', error: resendErr };
    }
    console.log(`✔ [Resend] Email gửi thành công (backup) tới: ${to}`);
    return { success: true, provider: 'resend' };
  } catch (resendException) {
    console.error(`✘ [Resend] Lỗi ngoài ý muốn:`, resendException);
    return { success: false, provider: 'resend', error: resendException };
  }
}
