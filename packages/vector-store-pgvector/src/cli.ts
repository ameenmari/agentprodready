import {
  applyMigrations,
  describeMigratorTarget,
  migrationStatus,
  rollbackLastMigration,
} from './migrator.js';
import { loadVectorIndexProfile, loadVectorPostgresConfig } from './config.js';

async function main(argv: readonly string[]): Promise<void> {
  const command = argv[2] ?? 'help';
  const config = loadVectorPostgresConfig();
  const profile = loadVectorIndexProfile();
  switch (command) {
    case 'migrate': {
      const applied = await applyMigrations(config, profile);
      process.stdout.write(
        `migrate:vector profile=${profile} target=${describeMigratorTarget(config)} applied=${applied.length === 0 ? '(none)' : applied.join(',')}\n`,
      );
      return;
    }
    case 'status': {
      const status = await migrationStatus(config, profile);
      for (const entry of status) {
        process.stdout.write(
          `${entry.id}\t${entry.applied ? 'applied' : 'pending'}${entry.appliedAt === undefined ? '' : `\t${entry.appliedAt}`}\n`,
        );
      }
      return;
    }
    case 'rollback': {
      const id = await rollbackLastMigration(config, profile);
      process.stdout.write(`rollback:vector ${id ?? '(none)'}\n`);
      return;
    }
    default:
      process.stdout.write(
        'Usage: node dist/cli.js <migrate|status|rollback>\nRequires VECTOR_INDEX_PROFILE and DATABASE_URL\nDestructive rollback requires VECTOR_ALLOW_RESET=1\n',
      );
      process.exitCode = command === 'help' ? 0 : 1;
  }
}

await main(process.argv);
