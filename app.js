const CONFIG = {
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbyGoQdR5xgepqns7HpyWoHjfJr4cDEMWaBFHoSzUo3uAFgjrrGZvWUKW2TvPLjIWCdy/exec",
  eventDate: "To be announced",
  eventTime: "To be announced",
  eventLocation: "AOU Egypt"
};

const ACADEMICS = {
  "Faculty of Business Studies": [
    "Business Studies — Accounting",
    "Business Studies — Finance with Microfinance",
    "Business Studies — Human Resource Management",
    "Business Studies — Management Information Systems",
    "Business Studies — Management",
    "Business Studies — Marketing"
  ],
  "Faculty of Computer Studies": [
    "Information Technology & Computing — Artificial Intelligence",
    "Information Technology & Computing — Computer Science",
    "Information Technology & Computing — Cybersecurity",
    "Information Technology & Computing — Data Science",
    "Information Technology & Computing — Web Development"
  ],
  "Faculty of Language Studies": [
    "English Language & Literature",
    "English Language, Literature & Translation"
  ],
  "Faculty of Education": [
    "Arts & Education — English Language",
    "Childhood & Education — Kindergarten",
    "Science & Education — Mathematics"
  ],
  "Faculty of Media & Mass Communication": [
    "Integrated Marketing Communication",
    "Mass Communication — Radio & TV",
    "News Journalism"
  ],
  "Graphic & Multimedia Design Technology": [
    "Graphic & Multimedia Design Technology"
  ]
};

const CLUB_TEAMS = [
  "Vice President",
  "Secretary & Coordination",
  "Finance & Treasury",
  "Technical Team",
  "Events & Operations",
  "Marketing & Media",
  "PR & Partnerships",
  "Community & Membership",
  "Projects & Hackathons",
  "HR / People & Culture",
  "General Member / Volunteer"
];

const THEME_KEY = "cbc-theme";
const SUBMISSION_TIMEOUT_MS = 50000;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const themeMedia = window.matchMedia("(prefers-color-scheme: dark)");

const form = document.getElementById("registrationForm");
const submitButton = form?.querySelector("button[type='submit']");
const submitLabel = submitButton?.querySelector(".submit-label");
const message = document.getElementById("formMessage");
const facultySelect = document.getElementById("facultySelect");
const majorSelect = document.getElementById("majorSelect");
const facultyCombined = document.getElementById("facultyCombined");
const teamInterest = document.getElementById("teamInterest");
const successPanel = document.getElementById("registrationSuccess");
const successRegistrationId = document.getElementById("successRegistrationId");
const registerAnother = document.getElementById("registerAnother");
const submitFrame = document.getElementById("submitFrame");
const nav = document.querySelector(".nav");
const navContainer = document.querySelector(".nav-links");
const themeToggle = document.getElementById("themeToggle");
const themeLabel = themeToggle?.querySelector(".theme-label");
const themeIcon = themeToggle?.querySelector(".theme-icon");
const progressItems = [...document.querySelectorAll(".form-progress > div")];
const formBlocks = [...document.querySelectorAll("#registrationForm .form-block")];

let submitTimer = null;
let activeSubmission = null;
let previousMenuFocus = null;

function sanitizeThemePreference(preference) {
  return ["system", "light", "dark"].includes(preference) ? preference : "system";
}

function readThemePreference() {
  try { return sanitizeThemePreference(localStorage.getItem(THEME_KEY) || "system"); }
  catch (_) { return "system"; }
}

function resolvedTheme(preference) {
  if (preference === "light" || preference === "dark") return preference;
  return themeMedia.matches ? "dark" : "light";
}

function applyTheme(preference) {
  const pref = sanitizeThemePreference(preference);
  const actual = resolvedTheme(pref);
  document.documentElement.dataset.themePreference = pref;
  document.documentElement.dataset.theme = actual;

  try { localStorage.setItem(THEME_KEY, pref); } catch (_) {}

  const text = pref === "system" ? "System" : pref === "dark" ? "Dark" : "Light";
  if (themeLabel) themeLabel.textContent = text;
  if (themeIcon) themeIcon.textContent = pref === "system" ? "◐" : actual === "dark" ? "☾" : "☀";
  if (themeToggle) {
    themeToggle.title = `Theme: ${text} · tap to change`;
    themeToggle.setAttribute("aria-label", `Theme: ${text}. Tap to change.`);
  }

  document.querySelectorAll("[data-mobile-theme]").forEach(el => { el.textContent = text; });
}

function cycleTheme() {
  const current = readThemePreference();
  const next = current === "system" ? "light" : current === "light" ? "dark" : "system";
  applyTheme(next);
}

applyTheme(readThemePreference());
themeToggle?.addEventListener("click", cycleTheme);
themeMedia.addEventListener?.("change", () => {
  if (readThemePreference() === "system") applyTheme("system");
});

function setEventDetails() {
  const date = document.getElementById("eventDate");
  const time = document.getElementById("eventTime");
  const location = document.getElementById("eventLocation");
  const year = document.getElementById("footerYear");

  if (date) date.textContent = CONFIG.eventDate;
  if (time) time.textContent = CONFIG.eventTime;
  if (location) location.textContent = CONFIG.eventLocation;
  if (year) year.textContent = String(new Date().getFullYear());
}
setEventDetails();

function collapseSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function digitsOnly(value) {
  return String(value || "").replace(/\D+/g, "");
}

function normalizePhone(value) {
  let raw = String(value || "").trim();
  if (!raw) return "";

  raw = raw.replace(/[\s().-]+/g, "");
  if (raw.startsWith("00")) raw = `+${raw.slice(2)}`;
  if (raw.startsWith("+20")) return `+20${digitsOnly(raw.slice(3))}`;

  const digits = digitsOnly(raw);
  if (/^01\d{9}$/.test(digits)) return `+20${digits.slice(1)}`;
  if (/^20(1\d{9})$/.test(digits)) return `+${digits}`;
  return raw.startsWith("+") ? `+${digits}` : digits;
}

function makeNonce() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function setHiddenField(name, value) {
  if (!form) return null;
  let input = form.querySelector(`input[type="hidden"][name="${name}"]`);
  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    form.appendChild(input);
  }
  input.value = String(value || "");
  return input;
}

function fillMajors(faculty, selectedMajor = "") {
  if (!majorSelect) return;
  const majors = ACADEMICS[faculty] || [];
  majorSelect.disabled = majors.length === 0;
  majorSelect.innerHTML = majors.length
    ? '<option value="">Select your programme / major</option>' + majors.map(name => `<option value="${name}">${name}</option>`).join("")
    : '<option value="">Choose a faculty first</option>';

  if (selectedMajor && majors.includes(selectedMajor)) majorSelect.value = selectedMajor;
  syncFacultyValue();
}

function fillAcademics(selectedFaculty = "", selectedMajor = "") {
  if (!facultySelect) return;
  facultySelect.innerHTML = '<option value="">Select your faculty</option>' +
    Object.keys(ACADEMICS).map(name => `<option value="${name}">${name}</option>`).join("");

  if (selectedFaculty && Object.prototype.hasOwnProperty.call(ACADEMICS, selectedFaculty)) {
    facultySelect.value = selectedFaculty;
  }
  fillMajors(facultySelect.value, selectedMajor);
}

function syncFacultyValue() {
  if (!facultyCombined) return;
  const faculty = facultySelect?.value || "";
  const major = majorSelect?.value || "";
  facultyCombined.value = faculty && major ? `${faculty} · ${major}` : "";
}

function validateAcademicPair() {
  if (!facultySelect || !majorSelect) return true;
  facultySelect.setCustomValidity("");
  majorSelect.setCustomValidity("");

  const faculty = facultySelect.value;
  const major = majorSelect.value;
  if (!faculty || !Object.prototype.hasOwnProperty.call(ACADEMICS, faculty)) return false;

  const majors = ACADEMICS[faculty] || [];
  if (!major || !majors.includes(major)) {
    majorSelect.setCustomValidity("Please select a programme / major that belongs to the selected faculty.");
    return false;
  }

  syncFacultyValue();
  return true;
}

function fillTeams(selectedTeam = "") {
  if (!teamInterest) return;
  teamInterest.innerHTML = '<option value="">Not sure yet</option>' +
    CLUB_TEAMS.map(team => `<option value="${team}">${team}</option>`).join("");
  if (selectedTeam && CLUB_TEAMS.includes(selectedTeam)) teamInterest.value = selectedTeam;
}

facultySelect?.addEventListener("change", () => {
  fillMajors(facultySelect.value);
  validateAcademicPair();
});
majorSelect?.addEventListener("change", () => {
  syncFacultyValue();
  validateAcademicPair();
});
fillAcademics();
fillTeams();

function prepareStaticFields() {
  if (!form) return;

  const fullName = form.elements.namedItem("fullName");
  if (fullName instanceof HTMLInputElement) {
    fullName.minLength = 5;
    fullName.maxLength = 100;
    fullName.setAttribute("autocapitalize", "words");
  }

  const email = form.elements.namedItem("email");
  if (email instanceof HTMLInputElement) {
    email.inputMode = "email";
    email.spellcheck = false;
  }

  const studentId = form.elements.namedItem("universityId");
  if (studentId instanceof HTMLInputElement) {
    studentId.inputMode = "numeric";
    studentId.autocomplete = "off";
    studentId.pattern = "[0-9]{7,10}";
    studentId.title = "Use your AOU student ID (7–10 digits).";
    studentId.maxLength = 10;
  }

  const phone = form.elements.namedItem("phone");
  if (phone instanceof HTMLInputElement) {
    phone.inputMode = "tel";
    phone.autocomplete = "tel";
    phone.placeholder = "+20 1XXXXXXXXX";
    phone.title = "Use an Egyptian mobile number such as 01XXXXXXXXX or +20 1XXXXXXXXX.";
    phone.pattern = "(?:\\+?20|0)?1[0125][0-9]{8}";
  }
}

function normalizeFormValues() {
  if (!form) return;

  const fullName = form.elements.namedItem("fullName");
  if (fullName && "value" in fullName) fullName.value = collapseSpaces(fullName.value);

  const email = form.elements.namedItem("email");
  if (email && "value" in email) email.value = String(email.value || "").trim().toLowerCase();

  const studentId = form.elements.namedItem("universityId");
  if (studentId && "value" in studentId) studentId.value = digitsOnly(studentId.value);

  const phone = form.elements.namedItem("phone");
  if (phone && "value" in phone) phone.value = normalizePhone(phone.value);

  syncFacultyValue();
}

function initFieldQuality() {
  if (!form) return;
  prepareStaticFields();

  form.addEventListener("focusout", event => {
    const field = event.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;

    if (field.name === "fullName") field.value = collapseSpaces(field.value);
    if (field.name === "email") field.value = String(field.value || "").trim().toLowerCase();
    if (field.name === "universityId") field.value = digitsOnly(field.value);
    if (field.name === "phone") field.value = normalizePhone(field.value);

    validateField(field, true);
  });
}

function initNav() {
  if (!nav) return;

  const syncScrolled = () => nav.classList.toggle("scrolled", window.scrollY > 10);
  syncScrolled();
  window.addEventListener("scroll", syncScrolled, { passive: true });

  const anchors = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const targets = anchors.map(anchor => ({
    anchor,
    section: document.querySelector(anchor.getAttribute("href"))
  })).filter(item => item.section);

  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(entries => {
    const active = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!active) return;
    targets.forEach(({ anchor, section }) => {
      anchor.classList.toggle("is-active", section === active.target);
    });
  }, { rootMargin: "-28% 0px -58% 0px", threshold: [0, .15, .35] });

  targets.forEach(({ section }) => observer.observe(section));
}

function initMobileMenu() {
  if (!navContainer || document.querySelector(".mobile-menu-toggle")) return;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "mobile-menu-toggle";
  toggle.setAttribute("aria-label", "Open navigation menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "mobileMenu");
  toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>';
  navContainer.insertBefore(toggle, navContainer.querySelector(".nav-apply") || null);

  const shell = document.createElement("div");
  shell.className = "mobile-menu-shell";
  shell.id = "mobileMenu";
  shell.setAttribute("aria-hidden", "true");
  shell.inert = true;
  shell.innerHTML = `
    <button class="mobile-menu-backdrop" type="button" aria-label="Close navigation menu"></button>
    <aside class="mobile-menu-panel" role="dialog" aria-modal="true" aria-label="Mobile navigation">
      <div class="mobile-menu-head">
        <div class="mobile-menu-brand"><span class="mobile-menu-mark" aria-hidden="true"></span><span><strong>Claude Builder Club</strong><small>AOU Egypt · Orientation</small></span></div>
        <button class="mobile-menu-close" type="button" aria-label="Close navigation menu">×</button>
      </div>
      <div class="mobile-menu-status live">Registration open</div>
      <nav class="mobile-menu-nav" aria-label="Mobile navigation links">
        <a href="#event">Event details</a>
        <a href="#register">Registration</a>
        <a href="#agenda">Agenda</a>
        <a href="#faq">FAQ</a>
        <a href="https://claudeaou.github.io/" target="_blank" rel="noopener noreferrer">Main club site ↗</a>
      </nav>
      <div class="mobile-menu-divider" aria-hidden="true"></div>
      <button class="mobile-menu-theme" type="button"><span>Appearance</span><span data-mobile-theme>System</span></button>
      <div class="mobile-menu-actions"><button class="mobile-menu-apply" type="button">Register now</button></div>
    </aside>`;
  document.body.appendChild(shell);

  const panel = shell.querySelector(".mobile-menu-panel");
  const closeBtn = shell.querySelector(".mobile-menu-close");
  const backdrop = shell.querySelector(".mobile-menu-backdrop");
  const themeButton = shell.querySelector(".mobile-menu-theme");
  const registerButton = shell.querySelector(".mobile-menu-apply");
  const viewport = window.matchMedia("(max-width: 760px)");

  const focusables = () => panel
    ? [...panel.querySelectorAll('a[href],button:not([disabled])')].filter(el => el.offsetParent !== null)
    : [];

  const open = () => {
    if (!viewport.matches) return;
    previousMenuFocus = document.activeElement;
    shell.inert = false;
    shell.classList.add("is-open");
    shell.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close navigation menu");
    document.body.classList.add("mobile-menu-open");
    setTimeout(() => closeBtn?.focus({ preventScroll: true }), reducedMotion ? 0 : 60);
  };

  const close = (restoreFocus = true) => {
    shell.classList.remove("is-open");
    shell.setAttribute("aria-hidden", "true");
    shell.inert = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");
    document.body.classList.remove("mobile-menu-open");
    if (restoreFocus && previousMenuFocus instanceof HTMLElement) previousMenuFocus.focus?.({ preventScroll: true });
    previousMenuFocus = null;
  };

  toggle.addEventListener("click", () => shell.classList.contains("is-open") ? close() : open());
  closeBtn?.addEventListener("click", () => close());
  backdrop?.addEventListener("click", () => close());
  shell.querySelectorAll(".mobile-menu-nav a").forEach(link => link.addEventListener("click", () => close(false)));
  themeButton?.addEventListener("click", cycleTheme);
  registerButton?.addEventListener("click", () => {
    close(false);
    setTimeout(() => document.getElementById("register")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" }), 40);
  });

  document.addEventListener("keydown", event => {
    if (!shell.classList.contains("is-open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const list = focusables();
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  viewport.addEventListener?.("change", event => { if (!event.matches) close(false); });
  applyTheme(readThemePreference());
}

function initMobileRegisterButton() {
  if (document.querySelector(".mobile-register-bar")) return;

  const bar = document.createElement("div");
  bar.className = "mobile-register-bar";
  bar.hidden = true;
  bar.innerHTML = '<span><strong>Orientation 2026</strong><small>Registration open</small></span><button type="button">Register</button>';
  document.body.appendChild(bar);

  bar.querySelector("button")?.addEventListener("click", () => {
    document.getElementById("register")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  });

  const mobile = window.matchMedia("(max-width: 760px)");
  const hero = document.getElementById("event");
  const register = document.getElementById("register");
  let heroVisible = true;
  let registerVisible = false;

  const sync = () => {
    const visible = mobile.matches && !heroVisible && !registerVisible;
    bar.hidden = !visible;
    document.body.classList.toggle("has-mobile-register-bar", visible);
  };

  if ("IntersectionObserver" in window) {
    if (hero) new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; sync(); }, { threshold: .12 }).observe(hero);
    if (register) new IntersectionObserver(([entry]) => { registerVisible = entry.isIntersecting; sync(); }, { threshold: .05 }).observe(register);
  }

  mobile.addEventListener?.("change", sync);
  sync();
}

function requiredFieldsAreValid(block) {
  const required = [...block.querySelectorAll("input[required],select[required],textarea[required]")];
  return required.length > 0 && required.every(field => field.checkValidity());
}

function syncFormProgress(activeBlock = null) {
  if (!progressItems.length || !formBlocks.length) return;
  let activeIndex = activeBlock ? formBlocks.indexOf(activeBlock) : -1;
  if (activeIndex < 0) activeIndex = formBlocks.findIndex(block => !requiredFieldsAreValid(block));
  if (activeIndex < 0) activeIndex = formBlocks.length - 1;

  progressItems.forEach((item, index) => {
    const complete = index < formBlocks.length && requiredFieldsAreValid(formBlocks[index]);
    item.classList.toggle("active", index === activeIndex);
    item.classList.toggle("complete", complete && index !== activeIndex);
    item.setAttribute("aria-current", index === activeIndex ? "step" : "false");
  });
}

function isConfigured() {
  return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(CONFIG.appsScriptUrl);
}

function setMessage(text, type = "") {
  if (!message) return;
  message.textContent = text;
  message.className = `orientation-form-message ${type}`.trim();
  message.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
  message.setAttribute("role", type === "error" ? "alert" : "status");
}

function setSubmitting(submitting) {
  if (!submitButton || !submitLabel || !form) return;
  submitButton.disabled = submitting;
  submitButton.classList.toggle("is-loading", submitting);
  submitLabel.textContent = submitting ? "Registering…" : "Complete registration";
  form.setAttribute("aria-busy", submitting ? "true" : "false");
}

function validateField(field, mark = false) {
  if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return true;

  if (field === facultySelect || field === majorSelect) validateAcademicPair();
  const valid = field.checkValidity();

  if (field.type !== "hidden" && mark) field.setAttribute("aria-invalid", valid ? "false" : "true");
  return valid;
}

function validateForm() {
  if (!form) return false;
  normalizeFormValues();
  validateAcademicPair();

  const fields = [...form.querySelectorAll("input, select, textarea")]
    .filter(field => field.name !== "website" && field.name !== "_nonce" && field.name !== "_parentOrigin");

  let firstInvalid = null;
  fields.forEach(field => {
    const valid = validateField(field, true);
    if (!valid && !firstInvalid && field.type !== "hidden") firstInvalid = field;
  });

  if (!facultyCombined?.value && !firstInvalid) firstInvalid = majorSelect || facultySelect;

  if (firstInvalid || !form.checkValidity() || !facultyCombined?.value) {
    setMessage("Please complete all required fields correctly before submitting.", "error");
    firstInvalid?.reportValidity?.();
    firstInvalid?.focus({ preventScroll: true });
    firstInvalid?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    syncFormProgress(firstInvalid?.closest?.(".form-block") || null);
    return false;
  }

  return true;
}

function clearSubmissionTimer() {
  if (submitTimer) clearTimeout(submitTimer);
  submitTimer = null;
}

function finishSubmission() {
  clearSubmissionTimer();
  activeSubmission = null;
  setSubmitting(false);
}

function isTrustedAppsScriptOrigin(origin) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && (
      url.hostname === "script.google.com" ||
      url.hostname === "script.googleusercontent.com" ||
      url.hostname.endsWith(".googleusercontent.com")
    );
  } catch (_) {
    return false;
  }
}

function showSuccess(data) {
  if (successRegistrationId) successRegistrationId.textContent = data.registrationId || "Confirmed";
  if (form) form.hidden = true;
  if (successPanel) {
    successPanel.hidden = false;
    successPanel.setAttribute("tabindex", "-1");
  }
  setMessage("");
  successPanel?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  setTimeout(() => successPanel?.focus({ preventScroll: true }), reducedMotion ? 0 : 120);
}

function beginSubmission() {
  if (!form || activeSubmission) return;

  if (!validateForm()) return;

  const honeypot = form.elements.namedItem("website");
  if (honeypot && "value" in honeypot && String(honeypot.value || "").trim()) {
    setMessage("We could not complete this registration.", "error");
    return;
  }

  if (!isConfigured()) {
    setMessage("Registration backend is not connected yet. Please contact the club team.", "error");
    return;
  }

  const nonce = makeNonce();
  setHiddenField("_nonce", nonce);
  setHiddenField("_parentOrigin", window.location.origin);

  activeSubmission = { nonce, startedAt: Date.now() };
  form.action = CONFIG.appsScriptUrl;
  setSubmitting(true);
  setMessage("Sending your registration…");

  try {
    HTMLFormElement.prototype.submit.call(form);
  } catch (error) {
    console.error("Orientation registration submission failed:", error);
    finishSubmission();
    setMessage("We could not send your registration. Please check your connection and try again.", "error");
    return;
  }

  clearSubmissionTimer();
  submitTimer = setTimeout(() => {
    if (!activeSubmission) return;
    activeSubmission = null;
    setSubmitting(false);
    setMessage("The registration service is taking longer than expected. Please check your inbox before trying again to avoid a duplicate registration.", "warning");
  }, SUBMISSION_TIMEOUT_MS);
}

initFieldQuality();

form?.addEventListener("focusin", event => {
  const block = event.target instanceof Element ? event.target.closest(".form-block") : null;
  if (block) syncFormProgress(block);
});

form?.addEventListener("input", event => {
  const field = event.target;
  if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
    if (field.getAttribute("aria-invalid") === "true") validateField(field, true);
  }
  syncFormProgress();
});

form?.addEventListener("change", event => {
  const field = event.target;
  if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
    validateField(field, field.hasAttribute("aria-invalid"));
  }
  syncFormProgress();
});

form?.addEventListener("submit", event => {
  event.preventDefault();
  if (activeSubmission) return;
  setMessage("");
  beginSubmission();
});

window.addEventListener("message", event => {
  if (!activeSubmission || !submitFrame?.contentWindow) return;
  if (event.source !== submitFrame.contentWindow) return;
  if (!isTrustedAppsScriptOrigin(event.origin)) return;

  const data = event.data;
  if (!data || typeof data !== "object" || data.source !== "cbc-orientation") return;
  if (data.type && data.type !== "CBC_ORIENTATION_RESULT") return;

  // New backend responses include a nonce. Legacy deployed responses do not,
  // so source + trusted-origin checks remain the compatibility fallback.
  if (data.nonce && String(data.nonce) !== activeSubmission.nonce) return;

  finishSubmission();

  if (data.ok) {
    showSuccess(data);
  } else {
    setMessage(data.message || "We could not complete your registration. Please try again.", "error");
  }
});

registerAnother?.addEventListener("click", () => {
  if (!form || !successPanel) return;
  finishSubmission();
  successPanel.hidden = true;
  successPanel.removeAttribute("tabindex");
  form.hidden = false;
  form.reset();
  fillAcademics();
  fillTeams();
  syncFacultyValue();
  form.querySelectorAll("[aria-invalid]").forEach(el => el.removeAttribute("aria-invalid"));
  setHiddenField("_nonce", "");
  setHiddenField("_parentOrigin", "");
  setMessage("");
  syncFormProgress(formBlocks[0] || null);
  form.querySelector("input:not([type='hidden'])")?.focus({ preventScroll: true });
});

syncFormProgress();
initNav();
initMobileMenu();
initMobileRegisterButton();
