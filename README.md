# Claude Builder Club – AOU Egypt Orientation

Orientation registration website for Claude Builder Club – AOU Egypt.

## Live site

https://mhmdwaelanwr.github.io/orientation/

Deployment target: GitHub Pages from the `main` branch through GitHub Actions.

## Included

- Responsive orientation landing page
- Registration form
- Google Apps Script backend
- Google Sheets storage
- Duplicate email prevention
- Unique registration IDs
- Automatic confirmation emails
- Bulk invitation and reminder functions
- GitHub Pages deployment workflow
- Client/server validation for AOU student IDs, academic selections, phone numbers and consent
- Submission locking, timeout handling and guarded iframe response handling
- Accessible mobile navigation with focus containment

## Backend

The frontend is connected to the deployed Google Apps Script Web App in `app.js`.

Registration data is written to the configured `Registrations` Google Sheet by `apps-script/Code.gs`.

The repository copy of `apps-script/Code.gs` is the source of truth for backend code, but changing that file in GitHub does **not** automatically update the deployed Apps Script Web App. After backend changes, copy/sync the updated Apps Script files into the Google Apps Script project and create/update the Web App deployment.

The frontend remains compatible with the previous deployed backend response format while also supporting the hardened nonce-based response format in the current source.

## Reliability and validation

The registration flow now:

- normalizes names, email addresses, AOU student IDs and Egyptian mobile numbers before submission
- validates that a programme/major belongs to the selected faculty
- prevents repeated client-side submissions while a request is active
- verifies iframe response source/origin before accepting a registration result
- supports nonce verification when the hardened Apps Script backend is deployed
- keeps legacy backend compatibility so frontend deployment does not interrupt live registration
- validates the same academic and identity constraints on the backend source
- treats submitted spreadsheet values as text to reduce spreadsheet formula-injection risk
- limits lock duration to the duplicate-check/write critical section so email sending does not block new registrations

## Event details

Date, time, and exact venue are currently marked as `To be announced`. Update both `app.js` and `apps-script/Code.gs` when the schedule is confirmed.

## Files

- `index.html` — site structure
- `styles.css` — responsive styling
- `app.js` — form validation, accessibility and submission transport
- `apps-script/Code.gs` — registration, validation, Sheets and email backend
- `apps-script/Tools.gs` — backend test helpers
- `apps-script/appsscript.json` — Apps Script manifest
- `.github/workflows/pages.yml` — GitHub Pages deployment

## Privacy

Do not commit passwords, Google credentials, private tokens, or other secrets. The public website only contains the deployed Apps Script endpoint required for form submission.
