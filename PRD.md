# Product Requirements — مكتب المحامي عبدالله أحمد العبيدي

## Original Problem Statement
Bilingual (Arabic RTL + English) professional lawyer website with two portals:
- Lawyer console: email/password JWT login; manage clients, cases (with live updates), invoices/fees, upload document archive per client/case; send messages + notifications; view/confirm appointment requests.
- Client portal: Emergent-managed Google Auth; view own cases live status, remaining fees; receive/send messages; book appointments; access personal document archive.
- Public landing showing: phone 07726317519, email aabbbd12341234@gmail.com, address بغداد - شارع فلسطين - حي المهندسين.

## User choices
- Lawyer auth: email/password (JWT).
- Client auth: Emergent-managed Google Auth (session cookie).
- Doc storage: local disk (/app/backend/uploads).
- Language: bilingual AR + EN with RTL toggle.

## Architecture
- Backend: FastAPI + Motor (MongoDB). All routes under /api.
- Frontend: React 19 + shadcn/ui + Tailwind. Router with hash-based AuthCallback for Google OAuth.
- Auth: (1) lawyer JWT bearer; (2) client httpOnly session_token cookie linking Google users to pre-registered client records by email.

## Done (2026-02-03)
- Public landing (RTL/LTR toggle), hero, services grid, contact section, footer.
- Lawyer login, dashboard (Overview / Clients / Cases / Documents / Invoices / Messages / Notifications / Appointments).
- Live case updates (append notes + auto notification to client).
- Document archive: uploaded via **Emergent object storage** (soft-deleted in DB; owner + lawyer can download).
- Invoice tracking with auto status (unpaid/partial/paid) + remaining fees.
- Client portal (Google login → session cookie → linked client record by email) with same tabs read-only + message send + appointment booking.
- Bilingual i18n (ar/en), Cairo/Tajawal (RTL) + Playfair Display (LTR) fonts, slate + gold aesthetic.
- Full data-testids across all interactive elements.
- Backend E2E tests 21/21 pass; frontend flows verified.

## Backlog / Future
- P1: Pagination for large lists (clients, cases, messages).
- P1: Email notifications via Resend when lawyer creates case update or notification.
- P1: Case document viewer inline (PDF preview) instead of download.
- P2: Time tracking + billable hours → auto invoice.
- P2: e-Signature on documents.
- P2: SMS notifications via Twilio for appointment reminders.
- P2: Move document storage from local disk to Emergent object storage (deployed persistence).
