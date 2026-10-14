const CONFIG = {
  SPREADSHEET_ID: '1IHgJEORmoeclWXh0Dz077PNbunAJqihbXMpv3fZ-ssM',
  SHEET_NAME: 'Registrations',
  CLUB_NAME: 'Claude Builder Club – AOU Egypt',
  EVENT_NAME: 'Founding Team Orientation',
  EVENT_DATE: 'To be announced',
  EVENT_TIME: 'To be announced',
  EVENT_LOCATION: 'AOU Egypt',
  CONTACT_EMAIL: 'claudebuilder.aou@gmail.com',
  SITE_URL: 'https://mhmdwaelanwr.github.io/orientation/',
  SITE_ORIGIN: 'https://mhmdwaelanwr.github.io'
};

const ACADEMICS = {
  'Faculty of Business Studies': [
    'Business Studies — Accounting',
    'Business Studies — Finance with Microfinance',
    'Business Studies — Human Resource Management',
    'Business Studies — Management Information Systems',
    'Business Studies — Management',
    'Business Studies — Marketing'
  ],
  'Faculty of Computer Studies': [
    'Information Technology & Computing — Artificial Intelligence',
    'Information Technology & Computing — Computer Science',
    'Information Technology & Computing — Cybersecurity',
    'Information Technology & Computing — Data Science',
    'Information Technology & Computing — Web Development'
  ],
  'Faculty of Language Studies': [
    'English Language & Literature',
    'English Language, Literature & Translation'
  ],
  'Faculty of Education': [
    'Arts & Education — English Language',
    'Childhood & Education — Kindergarten',
    'Science & Education — Mathematics'
  ],
  'Faculty of Media & Mass Communication': [
    'Integrated Marketing Communication',
    'Mass Communication — Radio & TV',
    'News Journalism'
  ],
  'Graphic & Multimedia Design Technology': [
    'Graphic & Multimedia Design Technology'
  ]
};

const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Other'];

const CLUB_TEAMS = [
  'Vice President',
  'Secretary & Coordination',
  'Finance & Treasury',
  'Technical Team',
  'Events & Operations',
  'Marketing & Media',
  'PR & Partnerships',
  'Community & Membership',
  'Projects & Hackathons',
  'HR / People & Culture',
  'General Member / Volunteer'
];

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
  const payload = normalizePayload_(e && e.parameter ? e.parameter : {});

  try {
    validatePayload_(payload);
  } catch (error) {
    return iframeResponse_({
      ok: false,
      message: friendlyError_(error)
    }, payload);
  }

  const lock = LockService.getScriptLock();
  let locked = false;
  let sheet;
  let rowNumber;
  let registrationId;

  try {
    lock.waitLock(10000);
    locked = true;

    sheet = getRegistrationSheet_();
    const duplicate = findRegistrationByEmail_(sheet, payload.email);

    if (duplicate) {
      return iframeResponse_({
        ok: false,
        message: 'This email is already registered for orientation.'
      }, payload);
    }

    registrationId = createRegistrationId_();
    const row = [
      new Date(),
      registrationId,
      safeSheetText_(payload.fullName),
      safeSheetText_(payload.email),
      safeSheetText_(payload.universityId),
      safeSheetText_(payload.faculty),
      safeSheetText_(payload.academicYear),
      safeSheetText_(payload.phone),
      safeSheetText_(payload.track),
      safeSheetText_(payload.consent),
      'Pending',
      safeSheetText_(payload.source)
    ];

    sheet.appendRow(row);
    rowNumber = sheet.getLastRow();
  } catch (error) {
    return iframeResponse_({
      ok: false,
      message: friendlyError_(error)
    }, payload);
  } finally {
    if (locked) {
      try { lock.releaseLock(); } catch (_) {}
    }
  }

  let emailStatus = 'Sent';
  try {
    sendConfirmationEmail_(payload, registrationId);
  } catch (emailError) {
    emailStatus = 'Failed: ' + String(emailError && emailError.message ? emailError.message : emailError).slice(0, 160);
  }

  try {
    if (sheet && rowNumber) sheet.getRange(rowNumber, 11).setValue(emailStatus);
  } catch (statusError) {
    console.error('Could not update email status:', statusError);
  }

  return iframeResponse_({
    ok: true,
    registrationId: registrationId,
    message: emailStatus === 'Sent'
      ? 'Registration completed successfully.'
      : 'Registration completed successfully. Confirmation email delivery is pending.'
  }, payload);
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
    if (!email || !isValidEmail_(email)) return;

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
    'We will email you if any event details are updated.',
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
    throw new Error('SERVER: Registration storage is not configured.');
  }

  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  } else {
    const existingHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0]
      .map(value => String(value || '').trim());
    if (existingHeaders.join('|') !== HEADERS.join('|')) {
      throw new Error('SERVER: Registration sheet columns do not match the expected format.');
    }
  }

  return sheet;
}

function findRegistrationByEmail_(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const emails = sheet.getRange(2, 4, lastRow - 1, 1).getDisplayValues().flat();
  const wanted = String(email || '').trim().toLowerCase();
  const index = emails.findIndex(value => String(value).trim().toLowerCase() === wanted);
  return index === -1 ? null : index + 2;
}

function normalizePayload_(p) {
  return {
    fullName: collapseSpaces_(clean_(p.fullName, 100)),
    email: clean_(p.email, 120).toLowerCase(),
    universityId: digitsOnly_(clean_(p.universityId, 30)),
    faculty: collapseSpaces_(clean_(p.faculty, 180)),
    academicYear: clean_(p.academicYear, 40),
    phone: normalizePhone_(clean_(p.phone, 25)),
    track: clean_(p.track, 60),
    consent: clean_(p.consent, 10),
    source: clean_(p.source || 'orientation-site', 60),
    website: clean_(p.website, 120),
    nonce: clean_(p._nonce, 120),
    parentOrigin: clean_(p._parentOrigin, 160)
  };
}

function validatePayload_(p) {
  if (p.website) throwValidation_('We could not complete this registration.');

  if (!p.fullName || !p.email || !p.universityId || !p.faculty || !p.academicYear) {
    throwValidation_('Please complete all required registration fields.');
  }

  if (p.fullName.length < 5) throwValidation_('Please enter your full name.');
  if (!isValidEmail_(p.email)) throwValidation_('Please enter a valid email address.');
  if (!/^[0-9]{7,10}$/.test(p.universityId)) throwValidation_('Please enter a valid AOU student ID (7–10 digits).');
  if (!ACADEMIC_YEARS.includes(p.academicYear)) throwValidation_('Please select a valid academic year.');
  if (!isValidFacultyMajor_(p.faculty)) throwValidation_('Please select a valid faculty and programme / major.');

  if (p.phone && !/^\+201[0125][0-9]{8}$/.test(p.phone)) {
    throwValidation_('Please enter a valid Egyptian mobile number or leave the phone field empty.');
  }

  if (p.track && !CLUB_TEAMS.includes(p.track)) throwValidation_('Please select a valid team interest.');
  if (p.consent !== 'yes') throwValidation_('Consent is required to complete registration.');
}

function isValidFacultyMajor_(combined) {
  const value = String(combined || '');
  const separator = ' · ';
  const index = value.indexOf(separator);
  if (index < 1) return false;

  const faculty = value.slice(0, index).trim();
  const major = value.slice(index + separator.length).trim();
  const majors = ACADEMICS[faculty] || [];
  return Boolean(faculty && major && majors.includes(major));
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function createRegistrationId_() {
  const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Africa/Cairo', 'yyMMdd');
  const token = Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `CBC-${date}-${token}`;
}

function iframeResponse_(payload, request) {
  const result = Object.assign({
    source: 'cbc-orientation',
    type: 'CBC_ORIENTATION_RESULT',
    nonce: String(request && request.nonce ? request.nonce : '')
  }, payload);

  const safeJson = JSON.stringify(result).replace(/</g, '\\u003c');
  const targetOrigin = allowedParentOrigin_(request && request.parentOrigin);
  const html = `<!doctype html><html><body><script>
    window.parent.postMessage(${safeJson}, ${JSON.stringify(targetOrigin)});
  <\/script></body></html>`;

  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function allowedParentOrigin_(origin) {
  const value = String(origin || '').trim();
  if (value === CONFIG.SITE_ORIGIN) return value;
  if (/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(value)) return value;
  return CONFIG.SITE_ORIGIN;
}

function normalizePhone_(value) {
  let raw = String(value || '').trim();
  if (!raw) return '';
  raw = raw.replace(/[\s().-]+/g, '');
  if (raw.indexOf('00') === 0) raw = '+' + raw.slice(2);
  if (raw.indexOf('+20') === 0) return '+20' + digitsOnly_(raw.slice(3));

  const digits = digitsOnly_(raw);
  if (/^01\d{9}$/.test(digits)) return '+20' + digits.slice(1);
  if (/^20(1\d{9})$/.test(digits)) return '+' + digits;
  return raw.indexOf('+') === 0 ? '+' + digits : digits;
}

function collapseSpaces_(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function digitsOnly_(value) {
  return String(value || '').replace(/\D+/g, '');
}

function safeSheetText_(value) {
  const text = String(value || '');
  if (!text) return '';
  // Prevent spreadsheet formula execution without altering normal values such as emails.
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function clean_(value, maxLength) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function throwValidation_(message) {
  throw new Error('VALIDATION:' + message);
}

function friendlyError_(error) {
  const message = String(error && error.message ? error.message : error || '');
  if (message.indexOf('VALIDATION:') === 0) return message.slice('VALIDATION:'.length);
  return 'We could not complete your registration right now. Please try again later or contact the club team.';
}
