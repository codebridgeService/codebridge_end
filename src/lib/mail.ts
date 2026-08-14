const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwJV1PnQnrReCOivTQVqulMlr1TNVmqU6yqjS3n5BjjKI52FyZqKTvg6DDGPlb5dd21iQ/exec';

const sendViaWebhook = async (mailOptions: any) => {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html
      })
    });
    const result = await response.json();
    if (result.status !== 'success') {
      throw new Error(result.message || 'Webhook failed');
    }
    return result;
  } catch (error) {
    console.error('Webhook Email Error:', error);
    throw error;
  }
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  
  const mailOptions = {
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>You recently requested to reset your password for your account. Click the button below to proceed.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you did not request this, please ignore this email. This link will expire in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #888;">&copy; ${new Date().getFullYear()} ServiceMe. All rights reserved.</p>
      </div>
    `,
  };

  return sendViaWebhook(mailOptions);
};

export const sendContactEmail = async ({ name, email, message }: { name: string, email: string, message: string }) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'codebridge2026@gmail.com';
  
  const mailOptions = {
    to: adminEmail,
    subject: `New Contact Form Submission from ${name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333; border-bottom: 2px solid #0070f3; padding-bottom: 10px;">New Message Received</h2>
        <div style="margin: 20px 0;">
          <p><strong>From:</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 10px; border-left: 4px solid #0070f3;">
            <p style="white-space: pre-wrap; margin: 0;">${message}</p>
          </div>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 11px; color: #888;">This message was submitted via the contact form on ${process.env.NEXT_PUBLIC_APP_URL || 'your website'}.</p>
      </div>
    `,
  };

  return sendViaWebhook(mailOptions);
};

export const sendOTPEmail = async (email: string, otp: string | number) => {
  const mailOptions = {
    to: email,
    subject: 'Your Verification Code',
    html: `
      <div style="font-family: 'Poppins', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 24px; color: #1A2368;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h2 style="font-size: 24px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">Verification Code</h2>
          <p style="color: #6B7280; font-size: 14px; margin-top: 8px;">Enter this code to complete your login.</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; border-radius: 20px; text-align: center; margin-bottom: 32px; border: 1px dashed #E5E7EB;">
          <span style="font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #1A2368; font-family: monospace;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #6B7280; text-align: center; margin: 0;">This code will expire in 5 minutes. If you didn't request this code, please ignore this email.</p>
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f0f0f0; text-align: center;">
          <p style="font-size: 12px; font-weight: 700; color: #1A2368; margin: 0;">Codebridge Team</p>
        </div>
      </div>
    `,
  };

  return sendViaWebhook(mailOptions);
};
