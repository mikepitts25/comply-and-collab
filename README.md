# Comply & Collab

**A collaborative cyber-compliance platform where compliance analysts and systems engineers work the same data.** Import ACAS and STIG results, auto-correlate findings to NIST 800-53 controls, generate and track POA&Ms, reuse mitigation statements, and manage the ATO lifecycle — with modern UX and real-time teamwork that eMASS lacks. Built to run **on-prem / air-gapped**.

---

## Why this exists (competitive gap)

| Tool | What it does | Where it falls short |
|------|--------------|----------------------|
| **eMASS** | DoD system of record for RMF/ATO & POA&Ms | Clunky UX, weak bulk ops, no real-time analyst↔engineer collaboration |
| **STIG Manager** | Excellent STIG checklist review workflow | STIG-only; no ACAS, POA&Ms, or full ATO lifecycle |
| **Vulnerator / OpenRMF** | Parse ACAS/STIG results | Dated UX, limited collaboration & lifecycle |
| **Xacta / RegScale** | Full commercial GRC | Expensive, heavyweight |
| **STIG Viewer + Tenable.sc** | Point tools | Don't talk to each other |

**Comply & Collab fills the middle:** one place that unifies ACAS **and** STIG, correlates everything to 800-53, drives the POA&M lifecycle, and is collaborative + self-hostable.

## Features (v0.1)

- **Scan ingestion pipeline** — ACAS `.nessus`, STIG `.ckl` (XML) / `.cklb` (JSON), and SCAP/XCCDF `.xml` (SCC, OpenSCAP; ARF-aware). De-duplicated across scans by rule/plugin per asset (first-seen / last-seen tracking).
- **Automatic control correlation** — STIG findings map to 800-53 via their CCIs; ACAS findings fall back to flaw-remediation controls (SI-2 / RA-5).
- **Unified findings view** — one table across sources with severity (CAT I/II/III ↔ Critical/High/Med/Low), status, asset, mapped controls, assignee, and filters, plus **bulk triage** (select many → set status / assignee at once).
- **POA&M automation** — generate POA&Ms from open findings, grouped by weakness across hosts, with severity-based remediation timelines, milestones, and control linkage.
- **Risk acceptance / waiver** — formal AO risk acceptance on a POA&M (rationale, residual risk, review date), restricted to ISSM/Admin; review-due dates surface on the dashboard.
- **Mitigation library** — reusable, control-tagged mitigation/remediation statements attachable to POA&Ms.
- **System / ATO management** — create and edit systems in-app (ISSM/Admin), with FIPS 199 categorization (auto high-water mark of C/I/A), ATO status & expiration countdown, asset inventory, and SSP control-implementation narratives.
- **Baseline control coverage & gap analysis** — for a system's categorization (Low/Mod/High), computes 800-53 baseline coverage: documented vs implemented per family, with drill-down and inline SSP narrative authoring to close gaps.
- **Common control inheritance** — designate a system as a common control provider (enclave/hosting environment); subscribing systems inherit its implemented controls (counted toward coverage, marked INHERITED with provenance).
- **Hardware/software inventory + PPSM** — per-system hardware list (make/model/serial/location/virtual), software inventory, and Ports/Protocols/Services Management registration (port, protocol, direction, boundary, classification, approval status) — flowing into the SSP.
- **Exports & documents** — eMASS-style POA&M in **XLSX** (styled workbook) and CSV; a hardware/software/PPSM **inventory workbook**; printable **SSP** (System Security Plan) and **SAR** (Security Assessment Report); an executive **portfolio scorecard**; and **STIG checklist export** — regenerate a DISA `.ckl` (STIG Viewer 2.x) or `.cklb` (STIG Viewer 3) per asset from current finding statuses, to round-trip triage back into STIG Viewer / eMASS.
- **Continuous monitoring (ConMon)** — posture trend chart (open findings over time by severity), finding burndown, aging buckets, and scan cadence. Rescans **auto-close** remediated findings (first/last-seen reconciliation) and auto-complete fully-resolved POA&Ms.
- **Automated ingestion API** — token-authenticated `POST /api/v1/scans` so pipelines can push ACAS/STIG/SCAP results; admin-managed API keys (hashed, revocable, run as their owning user under RBAC).
- **Collaboration** — per-finding and per-POA&M discussion threads, assignments, and an activity feed.
- **My Work** — a personal queue of findings assigned to you and POA&Ms you own (with due dates / overdue flags), plus risk acceptances awaiting your review (senior roles).
- **Executive portfolio scorecard** — a printable cross-system risk rollup (ATO status/expiration, open findings by severity, POA&M and coverage per system) with Markdown export, for leadership reporting.
- **Audit log** — a filterable, paginated trail of every action (imports, triage, POA&M changes, catalog loads, CAC sign-ins, API-key management) for compliance oversight.
- **Role-based access control** — capability-based RBAC enforced server-side on every mutation (Admin, ISSM, ISSO, Analyst, Engineer, Auditor), with the UI hiding actions a role can't perform and a read-only banner for observers.
- **User administration** — admins create/manage users, set roles, map EDIPI for CAC/PIV, reset passwords, and activate/deactivate accounts (with self-lockout protection).
- **CAC/PIV authentication** — client-certificate sign-in via a trusted reverse proxy (subject-DN header → EDIPI → provisioned user), alongside local password auth. Config-gated (`CLIENT_CERT_AUTH`).
- **Framework crosswalk (beyond US gov)** — per-system posture against **ISO/IEC 27001:2022** (all 93 Annex A controls) and **CIS Controls v8** (18 controls, IG tiers), derived from documented 800-53 implementation via crosswalk — no separate data entry, with CSV export. Adding a framework is a data-only change (`src/lib/data/frameworks/`).
- **Rate limiting** — login attempts (per IP + account, with audit-log entries) and the ingestion API (per IP, 429 + Retry-After) are throttled against brute force.
- **Frameworks** — NIST RMF / 800-53, DISA STIG/SRG, CMMC, FedRAMP (system-taggable).

## Tech stack

- **Next.js 15** (App Router, React 19, Server Actions) + **TypeScript**
- **PostgreSQL** + **Prisma** ORM
- **Tailwind CSS**
- Self-hosted JWT session auth (CAC/PIV-ready for production)
- No external SaaS dependencies — designed to run inside an enclave.

## Quick start (Docker — recommended)

```bash
# First boot: build, migrate, and load demo data
SEED=true docker compose up --build

# Open http://localhost:3000
# Sign in: analyst@demo.mil  /  Password123!  (also engineer@, issm@, admin@)
```

Subsequent runs: `docker compose up` (drop `SEED=true` after the first boot). Set a real `AUTH_SECRET` and `POSTGRES_PASSWORD` via environment for anything beyond local evaluation.

## Local development

```bash
cp .env.example .env                 # then edit DATABASE_URL / AUTH_SECRET
npm install
npm run db:migrate                   # apply migrations (or: npm run db:push)
npm run db:seed                      # load demo systems, scans, POA&Ms
npm run dev                          # http://localhost:3000
npm test                             # Vitest unit suite (parsers, RBAC, exports, …)
```

Tests and a type-check/build run in CI (`.github/workflows/ci.yml`) on every push and PR.

### Demo accounts

| Email | Role | Password |
|-------|------|----------|
| `admin@demo.mil` | Administrator | `Password123!` |
| `issm@demo.mil` | ISSM | `Password123!` |
| `analyst@demo.mil` | Compliance Analyst | `Password123!` |
| `engineer@demo.mil` | Systems Engineer | `Password123!` |
| `auditor@demo.mil` | Auditor (read-only) | `Password123!` |

### Sample scan files

`samples/` contains importable examples used by the seed and re-importable via **Import Scans**:

- `acas-scan.nessus` — ACAS credentialed scan, 2 hosts
- `rhel8-web01.ckl` — RHEL 8 STIG checklist (XML)
- `windows-app01.cklb` — Windows Server 2022 STIG checklist (JSON)
- `scap-rhel8-web01-xccdf.xml` — SCAP/XCCDF result for the RHEL 8 host

## How correlation works

```
STIG rule ──(CCI_REF)──▶ CCI ──(DISA CCI list)──▶ 800-53 control ──▶ Finding↔Control link
ACAS plugin ─────────────────(no CCI: SI-2/RA-5 fallback)──────────▶ Finding↔Control link
```

The app ships the **full NIST SP 800-53 Rev 5 catalog** (1,196 controls + enhancements across all 20 families, with Low/Mod/High baseline membership) and the **complete DISA CCI list** (5,098 CCIs, ~96% mapped to a control — at enhancement level where applicable, e.g. `CCI-000196 → IA-5(1)`). Admins can (re)load the bundle in-app from **Controls → Load catalog bundle**.

### Updating the catalog

Bundles in `src/lib/data/*.json` are generated offline from upstream sources by `scripts/build-catalog.ts`:

```bash
# fetch sources into .catalog-src/ (NIST OSCAL + DISA CCI list), then:
npm run build:catalog        # regenerates nist-800-53-rev5.json + cci-map-rev5.json
```

Sources: NIST OSCAL content (`usnistgov/oscal-content`) and the DISA CCI list mirrored in `ComplianceAsCode/content`.

## Project layout

```
prisma/
  schema.prisma          # full data model (systems, assets, controls, CCIs, findings, POA&Ms, ...)
  migrations/            # SQL migrations (prisma migrate deploy)
  seed.ts                # demo seed — runs the real ingest + POA&M pipeline
src/
  lib/
    parsers/             # nessus / ckl / cklb parsers + normalization
    ingest.ts            # parse -> upsert assets/findings -> correlate -> de-dup
    poam.ts              # POA&M generation from open findings
    data/                # bundled 800-53 Rev 5 catalog + DISA CCI map (JSON) + loaders
scripts/
  build-catalog.ts       # regenerate the bundles from upstream OSCAL + CCI sources
    auth.ts              # JWT session auth
  app/
    (dash)/              # authenticated app: dashboard, systems, findings, poams, controls, mitigations, import
    actions/             # server actions (auth, import, findings, poams, mitigations)
samples/                 # example ACAS/STIG files
```

## Air-gapped notes

- The container image carries the Prisma engines and runs `prisma migrate deploy` on boot, so no registry access is needed at runtime.
- For a fully offline **build**, pre-pull base images and pre-populate the npm/Prisma caches in your build environment.
- No outbound calls are made by the application at runtime.

## Roadmap

- ✅ Full OSCAL 800-53 Rev 5 catalog + complete DISA CCI import (with in-app admin loader)
- ✅ SCAP / XCCDF results ingestion (SCC / OpenSCAP, ARF-aware)
- ✅ eMASS-compatible POA&M export (CSV) and SSP generation (printable + Markdown)
- ✅ Continuous monitoring (ConMon) — posture trends, burndown, aging, rescan auto-closure
- XLSX export against the official eMASS POA&M workbook template
- ✅ Capability-based RBAC enforced on all mutations
- ✅ Hardware/software inventory + PPSM (ports, protocols & services)
- ✅ eMASS-style POA&M XLSX export (styled workbook)
- ✅ Automated scan ingestion API (token-authenticated)
- ✅ CAC/PIV (client-cert) authentication via trusted reverse proxy
- Hardware/software inventory reconciliation and ports/protocols/services (PPSM)

---

*For authorized use. v0.1 — foundation release.*
