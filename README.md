# Invoicer

A self-hosted, single-user invoicing system built for freelancers, consultants, and small IT shops who need straightforward invoice management without the complexity of full-blown accounting software. If you just need to track time, add charges, generate PDFs, and email invoices to your customers, Invoicer gets out of your way and lets you do exactly that — no multi-tenant setup, no user management overhead, no lengthy configuration wizards.

## Features

- **CSV Import**: Upload timesheet CSVs with automatic parsing
- **Custom Charges**: Add service fees, software licenses, hardware, and other non-time charges
- **Hierarchical Rates**: Set rates at customer, invoice, or entry level
- **Manual Entry**: Easy form for adding time entries
- **Invoice Generation**: Create professional PDF invoices
- **Email via Mailgun**: Send invoices directly to customers
- **Editable Templates**: Customize email and PDF templates from the UI
- **Send Reminders**: Resend invoices with a single click from the invoice detail page
- **Dark/Light Mode**: Modern glassmorphism UI with theme toggle
- **Docker Deployment**: Single command deployment with four containers (PostgreSQL, API, Web, Nginx)

## Quick Start

### Prerequisites

- Docker and Docker Compose
- (Optional) A Mailgun account for sending invoices via email

### Setup

1. Clone the repository:
   ```bash
   git clone git@github.com:WAN-Ninjas/Invoicer.git
   cd Invoicer
   ```

2. Create your environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your settings:
   ```env
   DB_PASSWORD=your_secure_password
   SESSION_SECRET=your_random_session_secret

   # Optional: Mailgun SMTP for sending invoices
   MAILGUN_SMTP_USER=postmaster@your-domain.mailgun.org
   MAILGUN_SMTP_PASS=your_mailgun_password
   MAILGUN_FROM_EMAIL=invoices@your-domain.com
   ```

   `DB_PASSWORD` and `SESSION_SECRET` are required — the app will not start without them. You can generate a session secret with `openssl rand -base64 32`. Email settings are only needed if you want to send invoices directly from the app.

4. Start the application:
   ```bash
   docker compose up -d
   ```

   This builds and starts four containers: PostgreSQL, the API server, the React frontend, and an Nginx reverse proxy. Database migrations run automatically on first start.

5. Access the application at [http://localhost:8080](http://localhost:8080)

   To use a different port, set `PORT` in your `.env` file (e.g., `PORT=3000`).

## Common Commands

### Docker Operations

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs (all services)
docker compose logs -f

# View logs for a specific service
docker compose logs -f api
docker compose logs -f web
docker compose logs -f db

# Rebuild after code changes
docker compose build && docker compose up -d

# Rebuild a specific service
docker compose build api && docker compose up -d api

# Full rebuild (no cache)
docker compose build --no-cache && docker compose up -d
```

### Database Operations

```bash
# Run database migrations
docker exec invoicer-api npx prisma migrate deploy

# Check migration status
docker exec invoicer-api npx prisma migrate status

# Open Prisma Studio (database GUI) — accessible at http://localhost:5555
docker exec -it invoicer-api npx prisma studio

# Reset database (WARNING: deletes all data)
docker exec invoicer-api npx prisma migrate reset

# Generate Prisma client after schema changes
docker exec invoicer-api npx prisma generate
```

### Backup & Restore

```bash
# Back up the database
./scripts/backup.sh

# Restore from a backup
./scripts/restore.sh backups/invoicer_backup_YYYYMMDD_HHMMSS.tar.gz

# Full portable export (database + Docker images)
./scripts/export-portable.sh
```

### Local Development

Requires Node.js >= 20 and a running PostgreSQL instance.

```bash
# Install dependencies
npm install

# Start both API and frontend dev servers
npm run dev

# Build all packages (shared → api → web)
npm run build

# Run database migrations locally
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Seed the database
npm run db:seed

# Type check
npm run typecheck

# Lint
npm run lint
```

## CSV Format

The CSV importer expects files in this format:

```csv
Date,Begin,End,Total Minutes,Task,Requestor,Company,Cost(90/hr),Running Total
11/30/25,8:30 PM,10:00 PM,90,VoIP Phone System Setup,Alex,Acme Corp,$135.00,$ 135.00
```

- **Date**: MM/DD/YY format
- **Begin/End**: H:MM AM/PM format
- **Total Minutes**: Integer (required)
- **Task**: Description of work performed
- **Requestor**: Person who requested the work
- Empty rows are automatically skipped

## Custom Charges

In addition to time entries, you can add custom charges to invoices:

- **Service Fee**: Monthly/recurring service fees
- **Software License**: Software licenses and subscriptions
- **Hardware/Product**: Physical items and hardware
- **Consulting**: One-time consulting fees
- **Expense**: Reimbursable expenses
- **Other**: Miscellaneous charges

Charges can be created independently and selected when creating invoices, just like time entries.

## Rate Hierarchy

Hourly rates are applied in this order (most specific wins):

1. **Entry-level override**: Set per individual time entry
2. **Invoice-level override**: Applies to all entries on the invoice
3. **Customer default**: Fallback rate set on the customer

## Project Structure

```
Invoicer/
├── packages/
│   ├── shared/          # Shared TypeScript types & utilities
│   ├── api/             # Express backend (TypeScript, Prisma, Puppeteer)
│   │   ├── prisma/      # Database schema & migrations
│   │   └── src/
│   │       ├── controllers/
│   │       ├── services/
│   │       └── routes/
│   └── web/             # React frontend (Vite, Tailwind CSS)
│       └── src/
│           ├── components/
│           ├── pages/
│           └── services/
├── docker/              # Dockerfiles & Nginx configs
├── scripts/             # Backup, restore & export scripts
└── docker-compose.yml
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PASSWORD` | PostgreSQL password | (required) |
| `SESSION_SECRET` | Session encryption key | (required) |
| `APP_URL` | Public URL of the application | `http://localhost:8080` |
| `PORT` | External port exposed by Nginx | `8080` |
| `MAILGUN_SMTP_HOST` | SMTP server | `smtp.mailgun.org` |
| `MAILGUN_SMTP_PORT` | SMTP port | `587` |
| `MAILGUN_SMTP_USER` | SMTP username | (empty) |
| `MAILGUN_SMTP_PASS` | SMTP password | (empty) |
| `MAILGUN_FROM_EMAIL` | Sender email address | (empty) |

## License

MIT
