# Omnibudget

Omnibudget is a Next.js presentation app backed by Supabase/Postgres. Domain models live in Drizzle (`src/db/schema.ts`), while Supabase owns migration files and delivery.

## Independent CSV module

The CSV statement preparation module runs without a database, Supabase credentials, a user account, or an Express service. It reads a file, validates its rows, flags possible duplicates within that file, and exports the selected valid rows.

```sh
npm ci
npm run dev
```

Open [http://localhost:3000/es/csv-import](http://localhost:3000/es/csv-import). Choose **Usar ejemplo ficticio** to try the module without sending personal data. The Spanish interface uses native HTML controls and has no module-specific styles.

The backend is in `src/modules/csv-import`. Next.js routes only adapt HTTP requests; the temporary frontend imports backend contracts as types and calls the API. See the [Spanish module guide](docs/modules/csv-import.md) and the [GA7-220501096-AA3-EV01 delivery notes](evidence/GA7-220501096-AA3-EV01/README.md).

```sh
npm test
npm run lint
npm run build
npm run typecheck
```

The database workflow below applies to the application's database-backed features.

## Development

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Local development reads `.env.local`. Switching Git branches does not automatically switch the database used by `next dev`; pull or write the branch-specific environment values before starting the server.

For an isolated local database, let Supabase run the Docker stack and write local env values:

```sh
npm run dev:local
```

This starts Supabase locally, writes `.env.development.local`, and starts Next.js. Use `npm run db:local:stop` when you are done.

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

For ordinary feature work:

```sh
git switch -c feature/name
npm run dev:local
npm run db:generate
npm run db:check
npm run db:migrate
```

Commit the generated migration on its own. After opening a PR, Supabase branching can apply `supabase/migrations` to the preview branch while Vercel builds the matching preview deployment.

For a Supabase preview branch, retrieve branch-scoped values before local testing:

```sh
npm run env:preview -- <branch-name-or-id>
vercel env pull .env.local --environment=preview --git-branch=<branch-name>
```

The `env:preview` command writes `.env.development.local` from Supabase branch credentials, so local `npm run dev` points at that branch DB. The Vercel command is useful when you also need other Vercel preview variables.

Vercel preview deployments can receive the matching Supabase branch environment automatically once the Supabase/Vercel branching integration is connected.
