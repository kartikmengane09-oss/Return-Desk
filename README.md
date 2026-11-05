# ReturnDesk

**ReturnDesk** is a return-request management dashboard designed to help support and operations teams review, track, and resolve customer returns from one place.

The application provides a structured workflow for return requests, including status tracking, resolution decisions, internal notes, search, filtering, sorting, and pagination.

> This repository is a project/demo application. Use sample data for evaluation; do not enter real customer or payment information.

## Demo access

A demo account is available for evaluation. **Demo credentials are shared privately in the project submission email and are intentionally not published in this repository.**

The application should be evaluated using the provided demo account and sample data.

## Features

- **Return request management** — view return requests and their customer, order, item, and reason details.
- **Workflow statuses** — track requests through `OPEN`, `IN_REVIEW`, `APPROVED`, `REJECTED`, and `COMPLETED`.
- **Resolution handling** — record a refund, replacement, or store credit decision.
- **Refund validation** — a refund amount is applicable to the `REFUND` resolution; it must be a valid positive amount.
- **Request notes** — keep notes associated with a return request.
- **Search and list controls** — search, filter, sort, and paginate request records.
- **Archive/soft-delete support** — retain request records using deletion/archive fields rather than treating removal as a hard delete.
- **Database-backed data** — persist records using PostgreSQL through Prisma.
- **Sample data seeding** — populate a clean database with 30 deterministic sample return requests and related notes.

## Tech stack

- [Next.js](https://nextjs.org/) — App Router
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma ORM](https://www.prisma.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [JOSE](https://github.com/panva/jose) — token/session-related cryptographic utilities

## Getting started

### Prerequisites

Install:

- Node.js and npm
- A PostgreSQL database (local PostgreSQL or a hosted provider such as Neon)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/kartikmengane09-oss/Return-Desk.git
cd Return-Desk
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local `.env` file in the project root. At minimum, configure the PostgreSQL connection string used by Prisma:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

Use the actual environment variable names expected by the application's authentication/session configuration as well. Keep all secrets in your local environment or deployment provider.

**Never commit your real `.env` file, database credentials, signing secrets, or demo passwords.** Use placeholder values in any example environment file.

### 4. Generate the Prisma client and apply migrations

```bash
npx prisma generate
npx prisma migrate deploy
```

For a local development database where you are creating and editing migrations, use Prisma's development migration workflow as appropriate:

```bash
npx prisma migrate dev
```

Do not run a database reset against a database containing data you need to keep.

### 5. Seed sample data (optional)

The seed script creates 30 sample return requests and associated notes. It is designed for a clean database and aborts if return requests already exist; it does not clear existing records.

```node
node prisma/seed.js
```

### 6. Run the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Build the application for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

## Data model overview

The Prisma schema defines the following core entities:

- **ReturnRequest** — order and item details, customer information, reason, status, resolution, optional refund amount, timestamps, and deletion/archive fields.
- **Note** — text notes associated with a return request and timestamped when created.

The schema also defines enums for return statuses, return reasons, and resolution types.

## Project structure

The project follows the Next.js App Router convention. The main areas include:

- `app/` — application routes and UI
- `prisma/schema.prisma` — Prisma data model
- `prisma/seed.js` — deterministic sample-data seed script
- `package.json` — dependencies and npm scripts

## Evaluation notes

- Use the demo credentials supplied privately with the submission.
- The seed script is intended for an empty database and will stop rather than delete existing data.
- The repository does not publish demo passwords or live database secrets.
- If you are testing locally, configure your own PostgreSQL connection and required authentication environment variables.

## Author

Developed as a return-management application project.

## Repository

[GitHub: kartikmengane09-oss/Return-Desk](https://github.com/kartikmengane09-oss/Return-Desk)
