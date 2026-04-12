import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || '465'),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify connection configuration
transporter.verify(function (error) {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server is ready to take our messages');
  }
});

export const sendVerificationEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: `"EAIP TPMS" <${process.env.MAIL_USER}>`,
    to: email,
    subject: 'Verify Your EAIP TPMS Account',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff;">
        <div style="margin-bottom: 32px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="100" style="vertical-align: middle;">
                <img src="https://eastafricanip.com/eaip-logo.png" alt="EAIP Logo" style="width: 100px; height: auto; display: block;">
              </td>
              <td style="vertical-align: middle; padding-left: 20px; text-align: left;">
                <h1 style="color: #0056b3; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.01em;">EAIP TPMS</h1>
                <p style="color: #64748b; font-size: 15px; margin-top: 4px; font-weight: 400;">Legal Practice Management System</p>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #f8fafc; padding: 40px; border-radius: 12px; text-align: center; border: 1px solid #edf2f7;">
          <h2 style="color: #1e293b; margin-top: 0; font-size: 18px; font-weight: 600; margin-bottom: 16px;">Verify Your Email Address</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">Please use the following 6-digit code to complete your registration. This code will expire in 15 minutes.</p>
          
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 16px 32px; border-radius: 8px; display: inline-block; font-size: 28px; font-weight: 600; color: #0056b3; font-family: 'SF Mono', SFMono-Regular, ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas, monospace; letter-spacing: 5px; user-select: all;">
            ${otp}
          </div>
          
          <p style="color: #94a3b8; font-size: 13px; margin-top: 32px; margin-bottom: 0;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
        
        <div style="margin-top: 40px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 24px;">
          <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 8px;">Authorized Legal Access Only</p>
          <p style="color: #cbd5e1; font-size: 11px; margin: 0;">&copy; 2026 East African IP. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
    return true;
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    console.error('Error sending verification email detailed:', {
      message: err.message,
      code: err.code,
      response: err.response,
      config: {
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        user: process.env.MAIL_USER,
        secure: process.env.MAIL_PORT === '465'
      }
    });
    return false;
  }
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  const mailOptions = {
    from: `"EAIP TPMS" <${process.env.MAIL_USER}>`,
    to: email,
    subject: 'Welcome to EAIP TPMS',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff;">
        <div style="margin-bottom: 32px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="100" style="vertical-align: middle;">
                <img src="https://eastafricanip.com/eaip-logo.png" alt="EAIP Logo" style="width: 100px; height: auto; display: block;">
              </td>
              <td style="vertical-align: middle; padding-left: 20px; text-align: left;">
                <h1 style="color: #0056b3; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.01em;">EAIP TPMS</h1>
                <p style="color: #64748b; font-size: 15px; margin-top: 4px; font-weight: 400;">Legal Practice Management System</p>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #f8fafc; padding: 40px; border-radius: 12px; border: 1px solid #edf2f7;">
          <h2 style="color: #1e293b; margin-top: 0; font-size: 20px; font-weight: 600; margin-bottom: 16px;">Welcome aboard, ${name}!</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Your account has been successfully verified. You now have full access to the East African IP Legal Practice Management System.</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://eastafricanip.com/login?returnTo=/dashboard" style="background-color: #0056b3; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Login to Dashboard</a>
          </div>
          
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px;">
            <p style="color: #475569; font-size: 14px; margin-top: 0; font-weight: 600;">Getting Started:</p>
            <ul style="color: #64748b; font-size: 14px; line-height: 1.6; padding-left: 20px; margin-bottom: 0;">
              <li>Explore your personalized dashboard</li>
              <li>Complete your professional profile</li>
              <li>If you're confused or need assistance, visit our <a href="https://eastafricanip.com/login?returnTo=/help" style="color: #0056b3; text-decoration: none; font-weight: 500;">Help & Support</a> page</li>
            </ul>
          </div>
        </div>
        
        <div style="margin-top: 40px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 24px;">
          <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 8px;">Authorized Legal Access Only</p>
          <p style="color: #cbd5e1; font-size: 11px; margin: 0;">&copy; 2026 East African IP. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

export const sendPasswordResetOtp = async (email: string, name: string, otp: string) => {
  const mailOptions = {
    from: `"EAIP TPMS" <${process.env.MAIL_USER}>`,
    to: email,
    subject: 'Your EAIP TPMS Password Reset Code',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff;">
        <div style="margin-bottom: 32px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="100" style="vertical-align: middle;">
                <img src="https://eastafricanip.com/eaip-logo.png" alt="EAIP Logo" style="width: 100px; height: auto; display: block;">
              </td>
              <td style="vertical-align: middle; padding-left: 20px; text-align: left;">
                <h1 style="color: #0056b3; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.01em;">EAIP TPMS</h1>
                <p style="color: #64748b; font-size: 15px; margin-top: 4px; font-weight: 400;">Legal Practice Management System</p>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #f8fafc; padding: 40px; border-radius: 12px; border: 1px solid #edf2f7; text-align: center;">
          <h2 style="color: #1e293b; margin-top: 0; font-size: 20px; font-weight: 600; margin-bottom: 16px;">Your Password Reset Code</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">Hello ${name}, we received a request to reset your password. Enter this code to create a new password.</p>
          
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px 40px; border-radius: 12px; display: inline-block; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: 700; color: #0056b3; letter-spacing: 8px; font-family: 'SF Mono', SFMono-Regular, ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas, monospace;">${otp}</span>
          </div>
          
          <p style="color: #94a3b8; font-size: 13px; margin-bottom: 0;">This code expires in <strong>10 minutes</strong>. If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
        
        <div style="margin-top: 40px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 24px;">
          <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 8px;">Authorized Legal Access Only</p>
          <p style="color: #cbd5e1; font-size: 11px; margin: 0;">&copy; 2026 East African IP. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset OTP email:', error);
    return false;
  }
};
