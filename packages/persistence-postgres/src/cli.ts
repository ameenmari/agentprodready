import {
  applyMigrations,
  describeMigratorTarget,
  migrationStatus,
  resetTestDatabase,
  rollbackLastMigration,
} from './migrator.js';
import { loadPostgresPersistenceConfig } from './config.js';

async function main(argv: readonly string[]): Promise<void> {
  const command = argv[2] ?? 'help';
  const config = loadPostgresPersistenceConfig();
  switch (command) {
    case 'migrate': {
      const applied = await applyMigrations(config);
      process.stdout.write(
        `migrate: target=${describeMigratorTarget(config)} applied=${applied.length === 0 ? '(none)' : applied.join(',')}\n`,
      );
      return;
    }
    case 'status': {
      const status = await migrationStatus(config);
      for (const entry of status) {
        process.stdout.write(
          `${entry.id}\t${entry.applied ? 'applied' : 'pending'}${entry.appliedAt === undefined ? '' : `\t${entry.appliedAt}`}\n`,
        );
      }
      return;
    }
    case 'rollback': {
      const id = await rollbackLastMigration(config);
      process.stdout.write(`rollback: ${id ?? '(none)'}\n`);
      return;
    }
    case 'reset': {
      await resetTestDatabase(config);
      process.stdout.write('reset: ok\n');
      return;
    }
    default:
      process.stdout.write(
        'Usage: node dist/cli.js <migrate|status|rollback|reset>\nDestructive commands require PERSISTENCE_ALLOW_RESET=1\n',
      );
      process.exitCode = command === 'help' ? 0 : 1;
  }
}

await main(process.argv);
