package auth

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"os"
	"time"
)

func sendOTPEmail(toEmail, otp string) error {
	host     := os.Getenv("SMTP_HOST")
	port     := os.Getenv("SMTP_PORT")
	user     := os.Getenv("SMTP_USER")
	pass     := os.Getenv("SMTP_PASS")
	fromEmail := os.Getenv("FROM_EMAIL")

	if host == "" || user == "" || pass == "" {
		return fmt.Errorf("SMTP not configured")
	}
	if port == "" { port = "587" }
	if fromEmail == "" { fromEmail = user }

	expiry := time.Now().Add(10 * time.Minute).Format("3:04 PM")

	body := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0a0f1e;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0d1535,#111a40);border:1px solid rgba(99,102,241,.25);border-radius:20px;overflow:hidden;">

        <!-- Header with gradient -->
        <tr><td style="background:linear-gradient(135deg,#1a1f4e,#0d1535);padding:32px 40px;border-bottom:1px solid rgba(99,102,241,.2);">
          <table width="100%%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                      <span style="color:white;font-size:20px;">⚡</span>
                    </td>
                    <td style="padding-left:10px;vertical-align:middle;">
                      <span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">EcoNet</span>
                    </td>
                  </tr>
                </table>
              </td>
              <td align="right" style="vertical-align:middle;">
                <span style="background:rgba(99,102,241,.2);border:1px solid rgba(99,102,241,.4);border-radius:999px;padding:4px 12px;font-size:12px;color:#a5b4fc;font-weight:600;">Email Verification</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px;">
          <p style="color:rgba(255,255,255,.5);font-size:14px;margin:0 0 8px;">Hello there 👋</p>
          <h1 style="color:#fff;font-size:26px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">Verify your email address</h1>
          <p style="color:rgba(255,255,255,.55);font-size:15px;line-height:1.7;margin:0 0 32px;">
            To complete your registration on <strong style="color:#a5b4fc;">EcoNet</strong>, please use the verification code below. This confirms your email address is valid.
          </p>

          <!-- OTP Box -->
          <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td align="center" style="background:linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.15));border:2px solid rgba(99,102,241,.4);border-radius:16px;padding:28px;">
              <p style="color:rgba(255,255,255,.5);font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin:0 0 14px;">Your Verification Code</p>
              <div style="font-size:42px;font-weight:800;color:#a5b4fc;letter-spacing:16px;font-family:monospace;margin-bottom:12px;">%s</div>
              <p style="color:rgba(255,255,255,.35);font-size:13px;margin:0;">Expires at %s</p>
            </td></tr>
          </table>

          <!-- Steps -->
          <table width="100%%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,.04);border-radius:12px;padding:20px;margin-bottom:28px;">
            <tr><td>
              <p style="color:rgba(255,255,255,.5);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin:0 0 12px;">How to verify:</p>
              <p style="color:rgba(255,255,255,.6);font-size:14px;margin:0 0 6px;">1. Go back to the EcoNet registration page</p>
              <p style="color:rgba(255,255,255,.6);font-size:14px;margin:0 0 6px;">2. Enter the 6-digit code shown above</p>
              <p style="color:rgba(255,255,255,.6);font-size:14px;margin:0;">3. Click "Verify Email" to complete setup</p>
            </td></tr>
          </table>

          <!-- Security warning -->
          <table width="100%%" cellpadding="0" cellspacing="0" style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:12px;padding:16px;">
            <tr>
              <td style="vertical-align:top;padding-right:10px;font-size:18px;">🔒</td>
              <td>
                <p style="color:#fca5a5;font-size:13px;font-weight:600;margin:0 0 4px;">Security Notice</p>
                <p style="color:rgba(255,255,255,.45);font-size:13px;margin:0;line-height:1.5;">
                  Never share this OTP with anyone. EcoNet will never ask for your verification code. If you didn't request this, please ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:rgba(0,0,0,.2);padding:20px 40px;border-top:1px solid rgba(255,255,255,.06);">
          <p style="color:rgba(255,255,255,.2);font-size:12px;margin:0;text-align:center;">
            © 2025 EcoNet Professional Collaboration Platform. This is an automated message.<br>
            Please do not reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`, otp, expiry)

	msg := fmt.Sprintf(
		"From: EcoNet <%s>\r\nTo: %s\r\nSubject: %s - Your EcoNet Verification Code\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		fromEmail, toEmail, otp, body,
	)

	addr := net.JoinHostPort(host, port)
	auth := smtp.PlainAuth("", user, pass, host)

	if port == "465" {
		tlsConf := &tls.Config{ServerName: host}
		conn, err := tls.Dial("tcp", addr, tlsConf)
		if err != nil { return fmt.Errorf("tls dial: %w", err) }
		client, err := smtp.NewClient(conn, host)
		if err != nil { return fmt.Errorf("client: %w", err) }
		if err = client.Auth(auth); err != nil { return fmt.Errorf("auth: %w", err) }
		if err = client.Mail(fromEmail); err != nil { return fmt.Errorf("mail: %w", err) }
		if err = client.Rcpt(toEmail); err != nil { return fmt.Errorf("rcpt: %w", err) }
		w, err := client.Data()
		if err != nil { return fmt.Errorf("data: %w", err) }
		fmt.Fprint(w, msg); w.Close()
		return client.Quit()
	}

	// 587 STARTTLS
	conn, err := net.Dial("tcp", addr)
	if err != nil { return fmt.Errorf("dial: %w", err) }
	client, err := smtp.NewClient(conn, host)
	if err != nil { return fmt.Errorf("client: %w", err) }
	if err = client.StartTLS(&tls.Config{ServerName: host}); err != nil { return fmt.Errorf("starttls: %w", err) }
	if err = client.Auth(auth); err != nil { return fmt.Errorf("auth: %w", err) }
	if err = client.Mail(fromEmail); err != nil { return fmt.Errorf("mail: %w", err) }
	if err = client.Rcpt(toEmail); err != nil { return fmt.Errorf("rcpt: %w", err) }
	w, err := client.Data()
	if err != nil { return fmt.Errorf("data: %w", err) }
	fmt.Fprint(w, msg); w.Close()
	return client.Quit()
}
