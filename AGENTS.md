# working with Omnibudget

Omnibudget is based off next.js, this is the fullstack presentation module for web

It uses next-intl

Use Conventional-Commits

Commit each database migration by itself, unless it is only local SQL generation/testing that does not affect DB history.

Keep this NextJS app's structure as close as possible to following MVC, like in Rails or Laravel, to save on round trips, as well as connecting to express, it also is to use Drizzle as the model generator, and can connect to the DB by itself

Project human readable business logic (or it's intention) can be found at @KB.md
