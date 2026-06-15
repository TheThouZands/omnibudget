# Omnibudget

Omnibudget is a Next.js presentation app backed by Supabase/Postgres. Domain models live in Drizzle (`src/db/schema.ts`), while Supabase owns migration files and delivery.

## Development

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Local development reads `.env.local`. Switching Git branches does not automatically switch the database used by `next dev`; pull or write the branch-specific environment values before starting the server.

## Database Workflow

Drizzle is the model generator and Supabase is the migration runner.

```sh
npm run db:generate      # Generate SQL from src/db/schema.ts into supabase/migrations
npm run db:check         # Validate generated Drizzle migration metadata
npm run db:migrate:dry   # Show pending Supabase migrations for the linked project
npm run db:migrate       # Apply pending migrations through Supabase
```

Commit each real database migration by itself. Use `drizzle-kit migrate` or `drizzle-kit push` only for disposable local testing, not for shared Supabase projects.

For a Supabase preview branch, retrieve branch-scoped values before local testing:

```sh
npx supabase branches get <branch-name-or-id> -o env
vercel env pull .env.local --environment=preview --git-branch=<branch-name>
```

Vercel preview deployments can receive the matching Supabase branch environment automatically once the Supabase/Vercel branching integration is connected.
