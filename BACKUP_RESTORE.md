# Postgres Backup &amp; Restore Runbook

Covers the `jabaib` database (schema in `server/src/database/entities`, migrations in
`server/src/database/migrations`) and the `server/uploads` directory (local file storage for
product/category/banner/review images — not in Postgres, must be backed up separately).

## What to back up

1. **Database** — `pg_dump`, daily minimum, hourly if order volume justifies it.
2. **Uploads directory** — `server/uploads` (or the path in `LOCAL_UPLOAD_DIR`). A DB restore
   without this leaves every product/review/banner image broken.

Keep both in lockstep: an upload backup older than the DB backup means orders/reviews can
reference images that were deleted since; a DB backup older than the uploads backup just
means some newer files are unreferenced (harmless, reclaim later).

## Backup

```bash
# Database — custom format (-Fc) so pg_restore can do selective/parallel restore.
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -Fc -f jabaib_$(date +%Y%m%d_%H%M%S).dump $DB_DATABASE

# Uploads — tar, keeping relative paths.
tar -czf uploads_$(date +%Y%m%d_%H%M%S).tar.gz -C server uploads
```

Ship both files off-box immediately (S3/equivalent) — a backup that lives only on the DB
host is lost in the same incident that takes the host down. Retention: daily for 14 days,
weekly for 3 months is a reasonable default for this scale; tighten if compliance requires
more.

Managed Postgres (RDS/Cloud SQL/etc.) usually has automated snapshots — prefer those for the
database and keep this `pg_dump` path as the portable/manual fallback (migrating providers,
restoring into a throwaway environment, etc.). Uploads still need the manual/cron path above
regardless, since they're outside Postgres.

## Restore

**Always restore into a new/empty database first, verify, then cut over** — never restore
over a live database you might still need.

```bash
# 1. Create an empty target database.
createdb -h $DB_HOST -U $DB_USERNAME jabaib_restore

# 2. Restore the dump into it.
pg_restore -h $DB_HOST -U $DB_USERNAME -d jabaib_restore --no-owner --clean --if-exists jabaib_20260101_030000.dump

# 3. Restore uploads next to it (adjust destination as needed).
tar -xzf uploads_20260101_030000.tar.gz -C /path/to/restored-server

# 4. Point a server instance at jabaib_restore (DB_DATABASE=jabaib_restore) and sanity-check:
#    admin login, a known order detail, a product with media.
```

Once verified, cut over by either renaming databases (`ALTER DATABASE jabaib RENAME TO
jabaib_old; ALTER DATABASE jabaib_restore RENAME TO jabaib;` — requires no active
connections to either) or by repointing `DB_DATABASE` in the server's env and redeploying.
Keep `jabaib_old` until the restore has been running cleanly for a while, then drop it.

### Migrations after restore

A dump restores the schema as it was at backup time, migrations table included. After
restoring, run `npm run migration:run` in `server/` to apply anything newer than the backup
before serving traffic from it.

## Point-in-time recovery (PITR)

Nightly `pg_dump` only recovers to the last backup, losing everything after it. If an
incident needs recovery to a specific minute (not just "last night"), that requires
continuous WAL archiving, which plain `pg_dump` does not provide — use your Postgres
provider's built-in PITR (most managed providers offer this) rather than hand-rolling WAL
shipping for a single-vendor app at this scale.

## Drill cadence

Untested backups are not backups. Restore into a scratch database at least quarterly and
confirm: the dump restores without error, row counts roughly match the source, and a server
instance pointed at the restored DB serves real requests (admin login + one order lookup is
enough to catch most structural problems).
