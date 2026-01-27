# Invoicer

A self-hosted invoicing system with CSV timesheet import, custom charges, hierarchical hourly rates, and a modern glassmorphism UI.

## Features

- **CSV Import**: Upload timesheet CSVs with automatic parsing
- **Custom Charges**: Add service fees, software licenses, hardware, and other non-time charges
- **Hierarchical Rates**: Set rates at customer, invoice, or entry level
- **Manual Entry**: Easy form for adding time entries
- **Invoice Generation**: Create professional PDF invoices
- **Email via Mailgun**: Send invoices directly to customers
- **Dark/Light Mode**: Modern glassmorphism UI with theme toggle
- **Docker Deployment**: Single command deployment

## Quick Start

### Prerequisites

- Docker and Docker Compose
- (Optional) Mailgun account for sending emails

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

4. Start the application:
   ```bash
   docker compose up -d
   ```

5. Access the application at [http://localhost:8080](http://localhost:8080)

## Common Commands

### Docker Operations

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f api
docker compose logs -f web
docker compose logs -f db

# Rebuild after code changes
docker compose build
docker compose up -d

# Rebuild specific service
docker compose build api
docker compose up -d api

# Full rebuild (no cache)
docker compose build --no-cache
docker compose up -d
```

### Database Operations

```bash
# Run database migrations
docker exec invoicer-api npx prisma migrate deploy

# Check migration status
docker exec invoicer-api npx prisma migrate status

# Open Prisma Studio (database GUI)
docker exec -it invoicer-api npx prisma studio

# Reset database (WARNING: deletes all data)
docker exec invoicer-api npx prisma migrate reset

# Generate Prisma client after schema changes
docker exec invoicer-api npx prisma generate
```

### Backup & Restore

```bash
# Quick backup (database only)
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh backups/invoicer_backup_YYYYMMDD_HHMMSS.tar.gz

# Full portable export (includes Docker images)
./scripts/export-portable.sh
```

### Development

```bash
# Install dependencies
npm install

# Start development servers (requires local PostgreSQL)
npm run dev

# Build all packages
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

## CSV Format

The CSV importer expects files in this format:

```csv
Date,Begin,End,Total Minutes,Task,Requestor,Company,Cost(90/hr),Running Total
11/30/25,8:30 PM,10:00 PM,90,3CX Multicast Setup,Trent,Air Comm,$135.00,$ 135.00
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
│   ├── shared/          # Shared types & utilities
│   ├── api/             # Express backend
│   │   ├── prisma/      # Database schema & migrations
│   │   └── src/
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── routes/
│   │       └── fonts/   # PDF fonts (Orbitron, Inter)
│   └── web/             # React frontend
│       └── src/
│           ├── components/
│           ├── pages/
│           └── services/
├── docker/              # Docker configuration
├── scripts/             # Backup & deployment scripts
└── docker-compose.yml
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PASSWORD` | PostgreSQL password | invoicer_password |
| `SESSION_SECRET` | Session encryption key | (required in production) |
| `PORT` | External port | 8080 |
| `MAILGUN_SMTP_HOST` | SMTP server | smtp.mailgun.org |
| `MAILGUN_SMTP_PORT` | SMTP port | 587 |
| `MAILGUN_SMTP_USER` | SMTP username | (empty) |
| `MAILGUN_SMTP_PASS` | SMTP password | (empty) |
| `MAILGUN_FROM_EMAIL` | Sender email | (empty) |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET/POST /api/customers` | Customer management |
| `GET/POST /api/entries` | Time entry management |
| `GET/POST /api/charges` | Custom charge management |
| `GET/POST /api/invoices` | Invoice management |
| `GET /api/invoices/:id/pdf` | Download invoice PDF |
| `POST /api/invoices/:id/send` | Email invoice to customer |
| `GET/PUT /api/settings` | Application settings |

## License

MIT
