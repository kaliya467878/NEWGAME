/**
 * Pluggable mailer. With no RESEND_API_KEY set, "sending" just logs to the
 * server console so the forgot-password flow is fully testable in dev.
 * Drop in a RESEND_API_KEY later and this switches to sending real emails
 * with no call-site changes.
 */
export async function sendOtpEmail(email: string, otp: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[mailer:dev] Password reset OTP for ${email}: ${otp}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Lucky Nova <noreply@luckynova.com>",
      to: [email],
      subject: "Your Lucky Nova password reset code",
      html: `<p>Your password reset code is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send OTP email: ${res.status} ${await res.text()}`);
  }
}
