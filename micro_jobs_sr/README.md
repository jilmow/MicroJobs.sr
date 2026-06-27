# MicroJobs SR

Cleaned project structure for the MicroJobs SR website.

## Start

```bash
npm install
npm start
```

The website runs on:

```text
http://localhost:3000
```

## Database

Run `db/schema.sql` in MySQL before starting the app.

The server reads these optional environment variables:

```text
PORT
DB_HOST
DB_USER
DB_PASSWORD
DB_NAME
```

If no variables are set, it uses the same local database settings as the original project.

## Empty starting data

This version does not include sample/demo jobs or sample/demo worker profiles. The worker and employer pages start empty while keeping the same frontend layout and styling.
