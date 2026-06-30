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

- **Scan ingestion pipeline** — ACAS `.nessus`, STIG `.ckl` (XML) and `.cklb` (JSON). De-duplicated across scans by rule/plugin per asset (first-seen / last-seen tracking).
- **Automatic control correlation** — STIG findings map to 800-53 via their CCIs; ACAS findings fall back to flaw-remediation controls (SI-2 / RA-5).
- **Unified findings view** — one table across sources with severity (CAT I/II/III ↔ Critical/High/Med/Low), status, asset, mapped controls, assignee, and filters.
- **POA&M automation** — generate POA&Ms from open findings, grouped by weakness across hosts, with severity-based remediation timelines, milestones, and control linkage.
- **Mitigation library** — reusable, control-tagged mitigation/remediation statements attachable to POA&Ms.
- **System / ATO management** — FIPS 199 categorization, ATO status & expiration countdown, asset inventory, and SSP control-implementation narratives.
- **Collaboration** — per-finding and per-POA&M discussion threads, assignments, and an activity feed.
- **Roles** — Admin, ISSM, ISSO, Analyst, Engineer, Auditor.
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
npm run db:seed                      # load demo system, scans, POA&Ms
npm run dev                          # http://localhost:3000
```

### Demo accounts

| Email | Role | Password |
|-------|------|----------|
| `admin@demo.mil` | Administrator | `Password123!` |
| `issm@demo.mil` | ISSM | `Password123!` |
| `analyst@demo.mil` | Compliance Analyst | `Password123!` |
| `engineer@demo.mil` | Systems Engineer | `Password123!` |

### Sample scan files

`samples/` contains importable examples used by the seed and re-importable via **Import Scans**:

- `acas-scan.nessus` — ACAS credentialed scan, 2 hosts
- `rhel8-web01.ckl` — RHEL 8 STIG checklist (XML)
- `windows-app01.cklb` — Windows Server 2022 STIG checklist (JSON)

## How correlation works

```
STIG rule ──(CCI_REF)──▶ CCI ──(catalog map)──▶ 800-53 control ──▶ Finding↔Control link
ACAS plugin ─────────────────(no CCI: SI-2/RA-5 fallback)────────▶ Finding↔Control link
```

The control catalog and CCI map live in `src/lib/data/catalog.ts` (a representative subset). A production deployment imports the full 800-53 catalog (OSCAL) and the complete DISA `U_CCI_List.xml`.

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
    data/catalog.ts      # 800-53 controls + CCI->control map
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

- Full OSCAL 800-53 catalog + complete DISA CCI import (admin importer)
- SCAP / XCCDF results ingestion
- eMASS-compatible POA&M export (CSV/XLSX) and SSP generation
- Continuous monitoring (ConMon) trends & scan scheduling
- CAC/PIV (client-cert) authentication and full RBAC enforcement
- Hardware/software inventory reconciliation and ports/protocols/services (PPSM)

---

*For authorized use. v0.1 — foundation release.*
