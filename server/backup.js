import { mkdir } from 'fs/promises';
import { spawn } from 'child_process';
import { join } from 'path';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL.');
  process.exit(1);
}

const backupDirectory = process.env.BACKUP_DIR || join(process.cwd(), 'backups');
const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const outputPath = join(backupDirectory, `sour-${timestamp}.dump`);

await mkdir(backupDirectory, { recursive: true });

const pgDump = spawn('pg_dump', ['--dbname', process.env.DATABASE_URL, '--format=custom', '--file', outputPath], {
  stdio: ['ignore', 'inherit', 'inherit'],
});

pgDump.once('error', (error) => {
  if (error.code === 'ENOENT') {
    console.error('pg_dump was not found. Install PostgreSQL client tools first.');
  } else {
    console.error(error);
  }
  process.exit(1);
});

pgDump.once('exit', (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }
  console.log(`Backup created at ${outputPath}`);
});