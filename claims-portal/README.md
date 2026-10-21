# ESS Portal (Angular)

The Employee Self-Service claims and requests portal, built from the Figma design in Angular 17 with Angular Material.
It is frontend only. Login, MFA, captcha and all data run on mock services backed by `localStorage`, so the whole app works without a backend.

## Run it

Requirements: Node 18.13+ (Node 20 or 22 recommended) and npm.

```bash
npm install
npm start          # ng serve, then open http://localhost:4200
npm run build      # production build into dist/claims-portal
```

## Demo login

| | |
|---|---|
| Username | `ahmed.raza` |
| Password | `Password@123` |
| Captcha | Type the characters shown (refresh icon draws a new one) |
| Microsoft Authenticator | Auto-approves after 6 seconds, or choose "Use a verification code" and enter any 6 digits. `000000` simulates a wrong code. |

Forgot password uses the same mock MFA, then lets you set a new password (strength rules are enforced on screen).

Ahmed is also set up as an approver, so the **Approvals** area shows colleagues' requests waiting on him at different steps.

To reset demo data, clear the site's localStorage (keys start with `ess.`) and reload, or call `RequestService.resetDemoData()`.

## What's included

- **Auth**: login with captcha and lockout after 5 attempts, Microsoft Authenticator number matching with code fallback and timeout, forgot / reset password.
- **Shell**: collapsible left nav (remembers state), global search, notifications dropdown (All / Unread, mark all read) and a full notifications page with preferences.
- **Dashboard**: stats, module tiles, recent requests, entitlements.
- **My Requests**: tabs with counts, type and period filters, CSV export, New request menu, paginated table with "Amount (in PKR)", side panel on row click, full request page with progress tracker and history.
- **Module forms**: Medical (OPD and IPD), PF Loan, Advance Salary, Fuel, Mobile, Child Fee, NESP, Courier, Stationery.
  Line items are added, edited and deleted through dialogs. Drafts can be saved and resumed.
- **Medical IPD**: the attending physician PDF stays locked until the employee section is complete. After submit, the claim page lets the employee download / print the pre-filled physician form, then upload the signed copy into the same claim.
- **Approvals**: approver queue and review page with step-specific fields, approve / send back / reject (remarks required for the last two).
- **Feedback**: redesigned popups (success, error, warning, delete confirm, leave warning) and toasts.

## Approval workflows

There is no line-manager approval on any module. Chains are defined in `src/app/core/modules.ts` (`workflowFor`).

| Module | Steps |
|---|---|
| Medical OPD | Accounts Officer → Senior Accounts Officer → Manager Finance & Accounts |
| Medical IPD | Employee uploads physician form → same three Finance steps |
| PF Loan | Officer Accounts → Manager Accounts → PF Trust |
| Advance Salary, Child Fee, NESP | HR → Finance |
| Fuel | Admin → Finance |
| Mobile | Finance |
| Courier | PM / Head of Department (official shipments only) → Admin dispatch |
| Stationery | PM / Head of Department (large quantity only) → Head of Admin |

Open question from the design: whether Courier and Stationery need the PM / HOD step. It is conditional here, as in the design, and can be removed in `workflowFor`.

## Project structure

```
src/app/
  core/      models, module + workflow definitions, mock data, services (auth, requests, notifications, feedback), guards, date adapter
  shared/    reusable UI: status chip, file upload, captcha, form sections, row dialog, progress tracker, popups, toasts, pipes
  auth/      login, MFA, forgot password, new password
  layout/    app shell (sidebar, topbar, notifications menu)
  pages/     dashboard, my requests, request detail/panel, approvals, approval review, notifications
  forms/     one component per module form, shared form kit, IPD claim page, physician PDF
```

## Connecting real APIs

Each service in `src/app/core/` returns Observables with simulated latency, so swapping in `HttpClient` calls keeps the components unchanged:

- `auth.service.ts`: replace `signIn`, `sendPush`, `verifyCode`, `startReset`, `setNewPassword` with MSAL / your identity API.
- `request.service.ts`: `submit`, `saveDraft`, `decide`, `withdraw`, `resubmit`, `completeEmployeeStep`.
- `notification.service.ts`: list / mark read.
- `shared/captcha.component.ts`: replace with your captcha provider.
- `mock-data.ts`: `MOCK_CONFIG` (credentials, MFA timings, latency), seed employee, family, entitlements and requests.

## Tech notes

- Angular 17.3 standalone components, signals, new control flow, lazy-loaded routes.
- Angular Material 17 with a custom theme (`src/styles.scss`), Inter font, Material Icons (bundled, no CDN).
- Dates use DD/MM/YYYY via a custom `DateAdapter`.
- The physician PDF is generated in the browser with jsPDF.
