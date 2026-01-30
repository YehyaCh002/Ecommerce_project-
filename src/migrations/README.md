# Migrations

This folder contains TypeORM migrations for managing database schema changes.

## Commands

### Generate a new migration
```bash
npm run migration:generate src/migrations/MigrationName
```

### Run pending migrations
```bash
npm run migration:run
```

### Revert the last migration
```bash
npm run migration:revert
```

## Notes

- Migrations are automatically generated based on entity changes
- Always review generated migrations before running them
- Keep migrations in version control
- Never modify a migration that has already been run in production
