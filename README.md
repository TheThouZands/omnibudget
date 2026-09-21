# Omnibudget

Omnibudget is a Next.js presentation app backed by Supabase/Postgres. Domain models live in Drizzle (`src/db/schema.ts`), while Supabase owns migration files and delivery.

The live version is available at [omnibudget.co](https://omnibudget.co). Local development uses a separate application instance.

## Independent CSV module

The CSV statement preparation engine runs without a database or an Express service. Its page and API endpoints require an account session. It reads a file, validates its rows, flags possible duplicates within that file, and exports the selected valid rows.

```sh
npm ci
npm run dev
```

Open [http://localhost:3000/es/csv-import](http://localhost:3000/es/csv-import) and complete the access flow. Development emulates email delivery and shows the OTP in the form. New addresses create an account; existing accounts require their password. Then choose **Usar ejemplo ficticio** to try the CSV module without sending personal data. The Spanish CSV interface uses native HTML controls and has no module-specific styles.

The backend is in `src/modules/csv-import`. Next.js routes only adapt HTTP requests; the temporary frontend imports backend contracts as types and calls the API. See the [Spanish module guide](docs/modules/csv-import.md) and the [GA7-220501096-AA3-EV01 delivery notes](evidence/GA7-220501096-AA3-EV01/README.md).

```sh
npm test
npm run lint
npm run build
npm run typecheck
```

The database workflow below applies to the application's database-backed features.

Account access uses Better Auth, Drizzle, and Argon2id. Production requires a separate `BETTER_AUTH_SECRET` of at least 32 random characters. See the [account access guide](docs/modules/account-access.md) for persistence, OTP gating, profile fields, and local testing. Development defaults to process-local accounts; use an isolated database and stable secrets to test persistence across server restarts.

## Development

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Development reads `.env.development.local` before `.env.local`. Variables already set in the shell take priority over these files. A Git branch change does not change the database connection. Check the environment values before you start the server. Do not use production database credentials or secrets for local tests.

### Storage options

| Configuration | Account and session storage | Data after a server restart |
| --- | --- | --- |
| Default development settings | Server memory | Lost |
| Database mode with a local connection | Local PostgreSQL | Retained |
| Database mode with a remote connection | Remote PostgreSQL | Retained; requires a connection to that server |

With the default settings, `npm run dev` uses memory for accounts, login sessions, and OTP state. A page reload does not clear this data. A server restart clears it. The browser cookie cannot restore a session that the server no longer has.

Database storage retains account records across application restarts. Valid sessions also require the original server secrets and browser cookies. Session and OTP expiration limits still apply.

### Persistent local development

Use the local Supabase stack to store data on this computer. It does not require a Supabase Cloud database. Install and start Docker Desktop, or a compatible container runtime. The first setup requires internet access to download dependencies and container images. See the [Supabase local setup guide](https://supabase.com/docs/guides/local-development/cli/getting-started).

From the repository directory, prepare the local database:

```sh
npm run db:local:start
npm run env:local
npm run db:migrate
```

`env:local` writes local connection values to the gitignored `.env.development.local` file. `db:migrate` applies migrations to the local database. It does not change the linked production database.

Before you start Next.js, check these values in `.env.development.local`:

```dotenv
OTP_STORE_MODE="database"
VERIFICATION_SESSION_STORE_MODE="database"
OTP_DELIVERY_MODE="emulated"
BETTER_AUTH_URL="http://localhost:3000"
```

Use the address and port of your local application for `BETTER_AUTH_URL`. Use the same hostname in the browser on each visit.

Set these three secrets in the same file. Generate a different random value of at least 32 characters for each secret. Keep the values unchanged between restarts. Do not reuse production secrets, commit them, or give them a `NEXT_PUBLIC_` prefix.

| Variable | Purpose |
| --- | --- |
| `BETTER_AUTH_SECRET` | Signs login-session cookies |
| `VERIFICATION_SESSION_HASH_SECRET` | Validates the browser's email-verification session |
| `OTP_HASH_SECRET` | Validates OTP challenges |

Then start the application:

```sh
npm run dev
```

Email delivery is emulated in this configuration. The form shows the test OTP. No real email is sent.

**Current generator limitation:** `env:local`, `env:branch`, and `env:preview` replace `.env.development.local`. They do not preserve manual changes. The generator supplies a fixed development OTP secret. It does not set the other two secrets. Set all three before testing session persistence. Without configured secrets, development can generate temporary secrets that change after a restart.

`npm run dev:local` starts the local stack, runs `env:local`, and starts Next.js. It therefore replaces this file too. After the setup above, use `npm run db:local:start` and `npm run dev` for later starts. If you regenerate the file, restore the same local settings and secrets before starting the application.

### Data retention and offline limits

Stop the local stack with `npm run db:local:stop`. Normal stop/start operations retain the database data in Docker volumes. `npm run db:local:reset` rebuilds the database and removes data that migrations or seed files do not restore. Deleting the data volumes also removes local data. To retain your data, do not reset the database or use the Supabase `--no-backup` stop option. See the [Supabase stop command](https://supabase.com/docs/reference/cli/supabase-stop).

- After setup, the local database and emulated access flow do not need a remote database connection.
- Local accounts and data do not synchronize with production.
- A failed remote connection does not switch the application to local storage or disable authentication.
- Production requires database storage and real SMTP delivery. OTP emulation is only for development.
- Local operation requires the application server and local database to run. This is not a browser-only offline mode.

## Database Workflow

Drizzle is the model generator and Supabase is the migration runner.

```sh
npm run db:generate      # Generate SQL from src/db/schema.ts into supabase/migrations
npm run db:check         # Validate generated Drizzle migration metadata
npm run db:migrate       # Apply pending migrations to the local Supabase Docker DB
npm run db:deploy:dry    # Show pending migrations for the linked Supabase project
npm run db:deploy        # Apply pending migrations to the linked Supabase project
```

Commit each real database migration by itself. Use `drizzle-kit migrate` or `drizzle-kit push` only for disposable local testing, not for shared Supabase projects.

After local setup, use this sequence for database changes:

```sh
git switch -c feature/name
npm run db:local:start
npm run db:generate
npm run db:check
npm run db:migrate
npm run dev
```

Commit the generated migration on its own. After opening a PR, Supabase branching can apply `supabase/migrations` to the preview branch while Vercel builds the matching preview deployment.

For a Supabase preview branch, retrieve branch-scoped values before local testing:

```sh
npm run env:preview -- <branch-name-or-id>
vercel env pull .env.local --environment=preview --git-branch=<branch-name>
```

The `env:preview` command writes `.env.development.local` from Supabase branch credentials, so local `npm run dev` points at that branch DB. The Vercel command is useful when you also need other Vercel preview variables.

Vercel preview deployments can receive the matching Supabase branch environment automatically once the Supabase/Vercel branching integration is connected.
