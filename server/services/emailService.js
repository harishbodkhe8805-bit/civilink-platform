const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

// Initialize Transporter
function initTransporter() {
  if (transporter) return transporter;

  const user = (process.env.SMTP_USER || '').trim();
  // Strip any spaces, underscores, or dashes from the Google App Password
  const pass = (process.env.SMTP_PASS || '').replace(/[\s_\-]/g, '').trim();

  if (user && pass) {
    // If Gmail account
    if (user.includes('@gmail.com') || process.env.SMTP_HOST === 'smtp.gmail.com') {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        pool: true,
        maxConnections: 3,
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 4000,
        auth: {
          user: user,
          pass: pass
        }
      });
    } else {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT, 10) || 465,
        secure: process.env.SMTP_PORT == 465,
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 4000,
        auth: {
          user: user,
          pass: pass
        }
      });
    }

    // Non-blocking verification check
    setImmediate(() => {
      transporter.verify((error, success) => {
        if (error) {
          console.error('[Email Service] ❌ SMTP Verification Failed:', error.message);
          console.error('[Email Service] Tip: Ensure 2-Step Verification is ON and the 16-letter App Password is correct.');
        } else {
          console.log(`[Email Service] ✅ Real Gmail SMTP connected & verified! Active sender: ${user}`);
        }
      });
    });

    return transporter;
  }

  // Local simulated fallback
  console.log('[Email Service] No SMTP credentials provided, running in local simulation logger mode.');
  transporter = {
    sendMail: async (mailOptions) => {
      console.log('====================================================');
      console.log(`📧 [EMAIL NOTIFICATION] TO: ${mailOptions.to}`);
      console.log(`📌 SUBJECT: ${mailOptions.subject}`);
      console.log(`📝 PREVIEW:\n${mailOptions.text.substring(0, 200)}...`);
      console.log('====================================================');
      return { messageId: 'simulated-' + Date.now() };
    }
  };
  return transporter;
}

function getSenderEmail() {
  const user = (process.env.SMTP_USER || '').trim();
  if (user) {
    return `"Civilink Platform" <${user}>`;
  }
  return process.env.EMAIL_FROM || '"Civilink Platform" <notifications@civilink.org>';
}

/**
 * 1. Send Email Notification to USER when Admin Approves/Rejects a Request
 */
async function sendRequestStatusNotification({ toEmail, userName, requestTitle, status, adminNotes }) {
  try {
    const transport = initTransporter();

    const isApproved = status === 'APPROVED';
    const isRejected = status === 'REJECTED';
    const isResolved = status === 'RESOLVED';

    const statusColor = isApproved ? '#10b981' : (isRejected ? '#ef4444' : '#0284c7');
    const statusIcon = isApproved ? '✅' : (isRejected ? '❌' : '🎉');
    const statusTitle = isApproved ? 'Approved & Live' : (isRejected ? 'Needs Revision / Rejected' : 'Marked as Resolved');

    const subject = `${statusIcon} Your Request "${requestTitle}" has been ${status} by Civilink Admin`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; letter-spacing: 0.5px; }
          .content { padding: 30px 24px; }
          .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 14px; color: #ffffff; background-color: ${statusColor}; margin-bottom: 16px; }
          .card-info { background-color: #f1f5f9; border-left: 4px solid ${statusColor}; padding: 16px; border-radius: 6px; margin: 20px 0; }
          .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #64748b; }
          .btn { display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Civilink Community Aid</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>An administrator has reviewed your community help request.</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <span class="badge">${statusIcon} ${statusTitle}</span>
            </div>

            <div class="card-info">
              <p style="margin: 0 0 8px 0;"><strong>Request Title:</strong> ${requestTitle}</p>
              <p style="margin: 0 0 8px 0;"><strong>Current Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${status}</span></p>
              ${adminNotes ? `<p style="margin: 0;"><strong>Admin Note / Verification Feedback:</strong> <em>"${adminNotes}"</em></p>` : ''}
            </div>

            ${isApproved ? `
              <p style="color: #065f46; font-weight: 500;">
                🎉 Your request is now publicly visible to all volunteers, NGOs, and community members on the Civilink Requests Portal.
              </p>
            ` : ''}

            ${isRejected ? `
              <p style="color: #991b1b;">
                Please review the admin's feedback above. You can update your request details or submit a revised request anytime.
              </p>
            ` : ''}

            <div style="text-align: center; margin-top: 25px;">
              <a href="http://localhost:5000/requests.html" class="btn" style="color: #ffffff;">View on Civilink Portal</a>
            </div>
          </div>
          <div class="footer">
            © 2026 Civilink Platform. This is an automated email notification regarding your submitted request.
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Hello ${userName},

An administrator has reviewed your community help request:
- Title: ${requestTitle}
- Status: ${status}
${adminNotes ? `- Admin Note: ${adminNotes}\n` : ''}

You can view the updated request at: http://localhost:5000/requests.html

Regards,
Civilink Community Platform
    `;

    const info = await transport.sendMail({
      from: getSenderEmail(),
      to: toEmail,
      subject: subject,
      text: textContent,
      html: htmlContent
    });

    console.log(`[Email Service] ✉️ Status email sent to USER [${toEmail}] for "${requestTitle}" (${status}). ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Email Service Error - User Notification]', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 2. Send Alert Email to ADMIN when a New Request is Submitted
 */
async function sendNewRequestAdminAlert({ userName, userEmail, requestTitle, category, urgency, location, latitude, longitude, contactInfo }) {
  try {
    const transport = initTransporter();
    const adminEmail = (process.env.SMTP_USER || 'admin@platform.com').trim();

    const subject = `🔔 [New Request] "${requestTitle}" submitted by ${userName}`;

    const mapLink = (latitude && longitude) 
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}` 
      : null;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
          .header { background: #0f172a; color: #ffffff; padding: 20px; text-align: center; }
          .content { padding: 25px; }
          .badge { padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 12px; color: #ffffff; background-color: #ef4444; }
          .card { background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 15px 0; font-size: 14px; }
          .btn { display: inline-block; padding: 10px 20px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; }
          .btn-map { display: inline-block; padding: 6px 12px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 12px; font-weight: 600; margin-top: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Civilink Admin Alert</h2>
          </div>
          <div class="content">
            <p><strong>A new community help request requires your moderation:</strong></p>
            
            <div class="card">
              <p><strong>Title:</strong> ${requestTitle}</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Urgency:</strong> <span class="badge">${urgency}</span></p>
              <p><strong>Requester:</strong> ${userName} (${userEmail})</p>
              <p><strong>Location:</strong> ${location}</p>
              ${mapLink ? `
                <p><strong>GPS Coordinates:</strong> 📍 ${latitude.toFixed(6)}, ${longitude.toFixed(6)}<br>
                <a href="${mapLink}" target="_blank" class="btn-map" style="color:#ffffff;">📍 View on Google Maps</a></p>
              ` : '<p class="text-muted"><em>No GPS coordinates attached</em></p>'}
              <p><strong>Contact:</strong> ${contactInfo}</p>
            </div>

            <div style="text-align: center; margin-top: 20px;">
              <a href="http://localhost:5000/admin.html" class="btn" style="color: #ffffff;">Open Admin Moderation Queue</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Civilink Admin Alert:
A new help request requires moderation.

- Title: ${requestTitle}
- Category: ${category}
- Urgency: ${urgency}
- Requester: ${userName} (${userEmail})
- Location: ${location}
${mapLink ? `- GPS Coordinates: ${latitude}, ${longitude} (Google Maps: ${mapLink})\n` : ''}
- Contact: ${contactInfo}

Review at: http://localhost:5000/admin.html
    `;

    const info = await transport.sendMail({
      from: getSenderEmail(),
      to: adminEmail,
      subject: subject,
      text: textContent,
      html: htmlContent
    });

    console.log(`[Email Service] 🔔 Alert email sent to ADMIN [${adminEmail}] for new request "${requestTitle}". ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Email Service Error - Admin Alert]', err.message);
    return { success: false, error: err.message };
  }
}

// Test & initialize transporter on load
initTransporter();

module.exports = {
  sendRequestStatusNotification,
  sendNewRequestAdminAlert,
  initTransporter
};
