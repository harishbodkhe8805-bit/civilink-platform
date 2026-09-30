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

/**
 * Send High Priority SOS Emergency Alert to Admin and Emergency Teams
 */
async function sendSOSEmergencyAlert(sosData) {
  try {
    const transport = initTransporter();
    const adminEmail = (process.env.SMTP_USER || 'harishbodkhe8805@gmail.com').trim();
    const { victimName, phone, emergencyType, location, latitude, longitude, peopleCount, description } = sosData;

    const subject = `🚨 [CRITICAL SOS EMERGENCY] ${emergencyType} Alert - ${victimName}`;
    const mapLink = (latitude && longitude) ? `https://www.google.com/maps?q=${latitude},${longitude}` : null;
    const satelliteLink = (latitude && longitude) ? `https://www.google.com/maps/@${latitude},${longitude},18z/data=!3m1!1e3` : null;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fef2f2; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.2); border: 2px solid #dc2626; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #ffffff; padding: 25px 20px; text-align: center; }
          .content { padding: 25px; color: #1f2937; line-height: 1.6; }
          .badge-sos { display: inline-block; padding: 6px 14px; border-radius: 50px; font-weight: bold; font-size: 14px; background-color: #dc2626; color: #ffffff; }
          .details-box { background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #fee2e2; }
          .detail-label { font-weight: 600; color: #991b1b; }
          .detail-value { font-weight: 700; color: #111827; }
          .btn-danger { display: inline-block; background-color: #dc2626; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 6px; }
          .btn-maps { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🚨 CRITICAL SOS EMERGENCY ALERT</h1>
            <p style="margin: 6px 0 0; opacity: 0.95; font-size: 14px;">Immediate Rescue & Aid Dispatch Needed</p>
          </div>
          <div class="content">
            <div style="text-align: center; margin-bottom: 15px;">
              <span class="badge-sos">${emergencyType.toUpperCase()}</span>
            </div>
            
            <p>An emergency SOS signal has been triggered on <strong>Civilink Platform</strong> with live location data.</p>
            
            <div class="details-box">
              <div class="detail-row"><span class="detail-label">Victim Name:</span> <span class="detail-value">${victimName}</span></div>
              <div class="detail-row"><span class="detail-label">Emergency Phone:</span> <span class="detail-value"><a href="tel:${phone}" style="color: #dc2626; text-decoration: none; font-size: 16px;">📞 ${phone}</a></span></div>
              <div class="detail-row"><span class="detail-label">Emergency Type:</span> <span class="detail-value">${emergencyType}</span></div>
              <div class="detail-row"><span class="detail-label">People Affected:</span> <span class="detail-value">${peopleCount}</span></div>
              <div class="detail-row"><span class="detail-label">Location:</span> <span class="detail-value">${location}</span></div>
              ${(latitude && longitude) ? `
                <div class="detail-row"><span class="detail-label">Exact GPS Coordinates:</span> <span class="detail-value" style="color: #2563eb;">📍 ${latitude}, ${longitude}</span></div>
              ` : ''}
              <div style="margin-top: 10px;">
                <span class="detail-label">Situation Details:</span>
                <p style="margin: 4px 0 0; font-style: italic; color: #374151;">"${description}"</p>
              </div>
            </div>

            <div style="text-align: center; margin-top: 25px;">
              ${mapLink ? `<a href="${mapLink}" class="btn-maps">🗺️ Open Google Maps Location</a>` : ''}
              ${satelliteLink ? `<a href="${satelliteLink}" class="btn-maps" style="background-color: #059669;">🛰️ Satellite View</a>` : ''}
              <a href="http://localhost:5000/admin.html" class="btn-danger">🛡️ Open Admin Moderation Panel</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
🚨 CRITICAL SOS EMERGENCY ALERT - Civilink
Immediate Rescue & Aid Required!

- Emergency Type: ${emergencyType}
- Victim: ${victimName}
- Phone: ${phone}
- People Affected: ${peopleCount}
- Location: ${location}
${mapLink ? `- GPS Coordinates: ${latitude}, ${longitude}\n- Google Maps: ${mapLink}\n` : ''}
- Situation: ${description}

Review in Admin Console: http://localhost:5000/admin.html
    `;

    const info = await transport.sendMail({
      from: getSenderEmail(),
      to: adminEmail,
      subject: subject,
      text: textContent,
      html: htmlContent
    });

    console.log(`[Email Service] 🚨 SOS EMERGENCY ALERT SENT TO ADMIN [${adminEmail}]! ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Email Service Error - SOS Alert]', err.message);
    return { success: false, error: err.message };
  }
}

// Test & initialize transporter on load
initTransporter();

module.exports = {
  sendRequestStatusNotification,
  sendNewRequestAdminAlert,
  sendSOSEmergencyAlert,
  initTransporter
};
