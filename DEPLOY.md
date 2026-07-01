# Deploying Comply & Collab

This guide covers deploying the app and loading the bundled sample scan data.
For the feature overview see [`README.md`](./README.md).

---

## Option A — Docker Compose (recommended)

Self-contained: brings up PostgreSQL + the app together, runs migrations on
boot, and (optionally) seeds demo data. Requires only Docker + Docker Compose.

```bash
# 1. Get the code
git clone <your-repo-url> comply-and-collab
cd comply-and-collab

# 2. First boot — build, migrate, AND load demo/test data.
#    Generate a real AUTH_SECRET; the compose default is a dev placeholder.
SEED=true AUTH_SECRET="$(openssl rand -base64 32)" docker compose up --build
```

Open **http://localhost:3000** and sign in (see [demo accounts](#demo-accounts)).

**Subsequent runs** — data persists in the `db-data` volume; do NOT re-seed:

```bash
docker compose up            # note: no SEED=true
```

**Configuration** (env vars read by `docker-compose.yml`):

| Variable | Purpose | Default |
|----------|---------|---------|
| `AUTH_SECRET` | Signs session JWTs — **set a real value** (`openssl rand -base64 32`) | dev placeholder |
| `POSTGRES_PASSWORD` | Database password | `comply` |
| `SEED` | `true` on first boot to load demo data, then remove | `false` |
| `SESSION_TTL_HOURS` | Session lifetime | `12` |

To stop and wipe everything (including the database volume):

```bash
docker compose down -v
```

---

## Option B — Local (Node 22 + your own PostgreSQL)

```bash
cp .env.example .env          # set DATABASE_URL + AUTH_SECRET
npm install
npm run db:migrate            # create the schema
npm run db:seed               # load demo/test data
npm run dev                   # http://localhost:3000  (or: npm run build && npm start)
```

---

## Demo accounts

Created by the seed. Password for all: `Password123!`

| Email | Role |
|-------|------|
| `admin@demo.mil` | Administrator |
| `issm@demo.mil` | ISSM |
| `analyst@demo.mil` | Compliance Analyst |
| `engineer@demo.mil` | Systems Engineer |
| `auditor@demo.mil` | Auditor (read-only) |

---

## Sample / test data

The bundled sample scans live in [`samples/`](./samples) and are **imported
automatically** by the seed (`SEED=true` / `npm run db:seed`) through the real
parse → correlate → POA&M pipeline:

| File | Type | Contents |
|------|------|----------|
| `acas-scan.nessus` | ACAS / Tenable | 2 hosts, 5 vulnerability findings (incl. a critical kernel CVE) |
| `rhel8-web01.ckl` | STIG (XML) | RHEL 8 STIG checklist |
| `windows-app01.cklb` | STIG (JSON) | Windows Server 2022 STIG |
| `scap-rhel8-web01-xccdf.xml` | SCAP / XCCDF | RHEL 8 SCAP results |
| `U_CCI_List.sample.xml` | DISA CCI list | representative CCI → 800-53 mapping |

### Importing manually (UI)

1. Sign in as `analyst@demo.mil` (has the `scan:import` capability).
2. Left nav → **Import Scans**.
3. Choose a target **system** (e.g. MDP).
4. Upload one or more files from `samples/` (`.nessus`, `.ckl`, `.cklb`, SCAP `.xml`).
5. Submit → the app parses, de-duplicates against history, correlates findings
   to 800-53 controls, and shows a summary. Then visit **Findings**, or generate
   POA&Ms from the system page.

### Importing programmatically (API)

For CI/pipelines, push scans to `POST /api/v1/scans` with an admin-issued API
key (create one under **Settings → API Keys**). The request runs as the key's
owning user under RBAC.

---

## Full catalog (production)

The seed loads a representative 800-53 subset so the demo works offline. To load
the **complete** NIST 800-53 Rev 5 catalog + DISA CCI list, an admin can load
the bundled dataset in-app from **Controls → Load catalog bundle**.

---

## Air-gapped notes

- **Runtime** makes no outbound calls; the container image carries the Prisma
  engines and runs `prisma migrate deploy` on boot.
- For an offline **build**, pre-pull the base images (`node:22-bookworm-slim`,
  `postgres:16-alpine`) and pre-populate the npm cache in your build environment,
  since the first `docker compose up --build` fetches these.
- Put the app behind a TLS-terminating reverse proxy. For CAC/PIV, enable
  `CLIENT_CERT_AUTH` and have the proxy pass the validated client-cert subject
  DN (see `.env.example`).
