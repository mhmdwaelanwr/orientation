const CONFIG = {
  SPREADSHEET_ID: '1IHgJEORmoeclWXh0Dz077PNbunAJqihbXMpv3fZ-ssM',
  SHEET_NAME: 'Registrations',
  CLUB_NAME: 'Claude Builder Club – AOU Egypt',
  EVENT_NAME: 'Founding Team Orientation',
  EVENT_DATE: 'To be announced',
  EVENT_TIME: 'To be announced',
  EVENT_LOCATION: 'AOU Egypt',
  CONTACT_EMAIL: 'claudebuilder.aou@gmail.com',
  SITE_URL: 'https://mhmdwaelanwr.github.io/orientation/'
};

const HEADERS = [
  'Timestamp',
  'Registration ID',
  'Full Name',
  'Email',
  'University ID',
  'Faculty / Major',
  'Academic Year',
  'Phone',
  'Interested Track',
  'Consent',
  'Email Status',
  'Source'
];

function doGet() {
  return HtmlService
    .createHtmlOutput('<h3>Claude Builder Club Orientation registration backend is online.</h3>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const payload = normalizePayload_(e && e.parameter ? e.parameter : {});
    validatePayload_(payload);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const sheet = getRegistrationSheet_();
      const duplicate = findRegistrationByEmail_(sheet, payload.email);

      if (duplicate) {
        return iframeResponse_({
          ok: false,
          message: 'This email is already registered for orientation.'
        });
      }

      const registrationId = createRegistrationId_();
      const row = [
        new Date(),
        registrationId,
        payload.fullName,
        payload.email,
        payload.universityId,
        payload.faculty,
        payload.academicYear,
        payload.phone,
        payload.track,
        payload.consent,
        'Pending',
        payload.source
      ];

      sheet.appendRow(row);
      const rowNumber = sheet.getLastRow();

      let emailStatus = 'Sent';
      try {
        sendConfirmationEmail_(payload, registrationId);
      } catch (emailError) {
        emailStatus = 'Failed: ' + String(emailError.message || emailError).slice(0, 160);
      }

      sheet.getRange(rowNumber, 11).setValue(emailStatus);

      return iframeResponse_({
        ok: true,
        registrationId: registrationId,
        message: 'Registration completed successfully.'
      });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return iframeResponse_({
      ok: false,
      message: friendlyError_(error)
    });
  }
}

function setupRegistrationSheet() {
  const sheet = getRegistrationSheet_();
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#d97757')
    .setFontColor('#ffffff');
  sheet.autoResizeColumns(1, HEADERS.length);
}

function sendOrientationInvites() {
  sendBulkEmail_('invite');
}

function sendOrientationReminder() {
  sendBulkEmail_('reminder');
}

function sendBulkEmail_(mode) {
  const sheet = getRegistrationSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  let sent = 0;

  values.forEach((row, index) => {
    const fullName = String(row[2] || '').trim();
    const email = String(row[3] || '').trim();
    const registrationId = String(row[1] || '').trim();
    if (!email) return;

    const subject = mode === 'reminder'
      ? `Reminder: ${CONFIG.EVENT_NAME} | ${CONFIG.CLUB_NAME}`
      : `You're invited: ${CONFIG.EVENT_NAME} | ${CONFIG.CLUB_NAME}`;

    const intro = mode === 'reminder'
      ? `This is a reminder for your upcoming ${CONFIG.EVENT_NAME}.`
      : `Your orientation registration is confirmed. We'd be glad to have you with us.`;

    const html = emailTemplate_({
      fullName,
      registrationId,
      title: mode === 'reminder' ? 'Orientation reminder' : 'You’re on the list.',
      intro
    });

    const text = [
      `Hi ${fullName || 'Builder'},`,
      '',
      intro,
      `Registration ID: ${registrationId || '—'}`,
      `Date: ${CONFIG.EVENT_DATE}`,
      `Time: ${CONFIG.EVENT_TIME}`,
      `Location: ${CONFIG.EVENT_LOCATION}`,
      '',
      CONFIG.CLUB_NAME
    ].join('\n');

    MailApp.sendEmail({
      to: email,
      subject,
      body: text,
      htmlBody: html,
      name: CONFIG.CLUB_NAME,
      replyTo: CONFIG.CONTACT_EMAIL
    });

    sheet.getRange(index + 2, 11).setValue(mode === 'reminder' ? 'Reminder sent' : 'Invite sent');
    sent += 1;
    Utilities.sleep(120);
  });

  console.log(`Sent ${sent} ${mode} email(s).`);
}

function sendConfirmationEmail_(payload, registrationId) {
  const subject = `Registration confirmed: ${CONFIG.EVENT_NAME}`;
  const html = emailTemplate_({
    fullName: payload.fullName,
    registrationId,
    title: 'Registration confirmed.',
    intro: 'Thanks for registering for the Claude Builder Club – AOU Egypt orientation. Your seat has been recorded.'
  });

  const text = [
    `Hi ${payload.fullName},`,
    '',
    `Your registration for ${CONFIG.EVENT_NAME} is confirmed.`,
    `Registration ID: ${registrationId}`,
    `Date: ${CONFIG.EVENT_DATE}`,
    `Time: ${CONFIG.EVENT_TIME}`,
    `Location: ${CONFIG.EVENT_LOCATION}`,
    '',
    `We will email you if any event details are updated.`,
    '',
    CONFIG.CLUB_NAME
  ].join('\n');

  MailApp.sendEmail({
    to: payload.email,
    subject,
    body: text,
    htmlBody: html,
    name: CONFIG.CLUB_NAME,
    replyTo: CONFIG.CONTACT_EMAIL
  });
}

function emailTemplate_(data) {
  const name = escapeHtml_(data.fullName || 'Builder');
  const id = escapeHtml_(data.registrationId || '—');
  const title = escapeHtml_(data.title || 'Orientation update');
  const intro = escapeHtml_(data.intro || '');

  return `
  <div style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,sans-serif;color:#171613">
    <div style="max-width:640px;margin:0 auto;padding:28px 16px">
      <div style="background:#fffdf8;border:1px solid #e2ddd3;border-radius:24px;overflow:hidden">
        <div style="background:#d97757;padding:34px 34px 30px;color:#fffaf7">
          <div style="font-size:12px;letter-spacing:1.4px;font-weight:700;text-transform:uppercase">CLAUDE BUILDER CLUB · AOU EGYPT</div>
          <h1 style="margin:14px 0 0;font-size:34px;line-height:1.05">${title}</h1>
        </div>
        <div style="padding:34px">
          <p style="font-size:17px;margin:0 0 16px">Hi ${name},</p>
          <p style="font-size:15px;line-height:1.7;color:#625d55;margin:0 0 26px">${intro}</p>
          <div style="background:#f4f1ea;border-radius:18px;padding:22px">
            ${detailRow_('Registration ID', id)}
            ${detailRow_('Date', escapeHtml_(CONFIG.EVENT_DATE))}
            ${detailRow_('Time', escapeHtml_(CONFIG.EVENT_TIME))}
            ${detailRow_('Location', escapeHtml_(CONFIG.EVENT_LOCATION))}
          </div>
          <p style="font-size:13px;line-height:1.7;color:#777168;margin:24px 0 0">Keep this email for reference. If any event details change, we’ll contact you using this email address.</p>
        </div>
        <div style="padding:20px 34px;border-top:1px solid #ece6dc;font-size:12px;color:#80796f">
          ${escapeHtml_(CONFIG.CLUB_NAME)} · ${escapeHtml_(CONFIG.CONTACT_EMAIL)}
        </div>
      </div>
    </div>
  </div>`;
}

function detailRow_(label, value) {
  return `<div style="display:flex;justify-content:space-between;gap:18px;padding:9px 0;border-bottom:1px solid #ddd6cb">
    <span style="font-size:12px;color:#777168;text-transform:uppercase;letter-spacing:.7px">${label}</span>
    <strong style="font-size:14px;text-align:right">${value}</strong>
  </div>`;
}

function getRegistrationSheet_() {
  if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID === 'PASTE_GOOGLE_SHEET_ID_HERE') {
    throw new Error('Backend is not configured: add the Google Sheet ID in CONFIG.SPREADSHEET_ID.');
  }

  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  } else {
    const existingHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    if (existingHeaders.join('|') !== HEADERS.join('|')) {
      throw new Error(`Sheet "${CONFIG.SHEET_NAME}" exists but its columns do not match the expected registration format.`);
    }
  }

  return sheet;
}

function findRegistrationByEmail_(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const emails = sheet.getRange(2, 4, lastRow - 1, 1).getDisplayValues().flat();
  const wanted = email.toLowerCase();
  const index = emails.findIndex(value => String(value).trim().toLowerCase() === wanted);
  return index === -1 ? null : index + 2;
}

function normalizePayload_(p) {
  return {
    fullName: clean_(p.fullName, 100),
    email: clean_(p.email, 120).toLowerCase(),
    universityId: clean_(p.universityId, 30),
    faculty: clean_(p.faculty, 100),
    academicYear: clean_(p.academicYear, 40),
    phone: clean_(p.phone, 25),
    track: clean_(p.track, 60),
    consent: clean_(p.consent, 10),
    source: clean_(p.source || 'orientation-site', 60)
  };
}

function validatePayload_(p) {
  if (!p.fullName || !p.email || !p.universityId || !p.faculty || !p.academicYear) {
    throw new Error('Please complete all required registration fields.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
    throw new Error('Please enter a valid email address.');
  }
  if (p.consent !== 'yes') {
    throw new Error('Consent is required to complete registration.');
  }
}

function createRegistrationId_() {
  const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Africa/Cairo', 'yyMMdd');
  const token = Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `CBC-${date}-${token}`;
}

function iframeResponse_(payload) {
  const safeJson = JSON.stringify(payload).replace(/</g, '\u003c');
  const html = `<!doctype html><html><body><script>
    window.parent.postMessage(Object.assign({source:'cbc-orientation'}, ${safeJson}), '*');
  <\/script></body></html>`;

  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function clean_(value, maxLength) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, maxLength);
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function friendlyError_(error) {
  const message = String(error && error.message ? error.message : error || 'Unknown error');
  return message.length > 220 ? 'We could not complete your registration. Please contact the club team.' : message;
}
