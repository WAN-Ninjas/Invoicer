# Invoicer

A self-hosted invoicing system with CSV timesheet import, hierarchical hourly rates, and a modern glassmorphism UI.

## Features

- **CSV Import**: Upload timesheet CSVs with automatic parsing
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
   docker-compose up -d
   ```

5. Access the application at [http://localhost:8080](http://localhost:8080)

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

## Rate Hierarchy

Hourly rates are applied in this order (most specific wins):

1. **Entry-level override**: Set per individual time entry
2. **Invoice-level override**: Applies to all entries on the invoice
3. **Customer default**: Fallback rate set on the customer

## Development

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up the database (requires PostgreSQL):
   ```bash
   # Update DATABASE_URL in .env
   npm run db:migrate
   ```

3. Start the development servers:
   ```bash
   npm run dev
   ```

   This starts:
   - API server at http://localhost:3000
   - Web app at http://localhost:5173

### Project Structure

```
Invoicer/
├── packages/
│   ├── shared/          # Shared types & utilities
│   ├── api/             # Express backend
│   └── web/             # React frontend
├── docker/              # Docker configuration
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

## License

MIT
