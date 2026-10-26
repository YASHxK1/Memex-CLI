#!/usr/bin/env node
import { Command, CommanderError, InvalidArgumentError } from 'commander';
import { createRequire } from 'node:module';
import { add, index, list, login, logout, reindex, remove, search, status } from './commands.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };
const program = new Command();

function positiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100 || String(parsed) !== value) throw new InvalidArgumentError('must be an integer from 1 to 100');
  return parsed;
}
function score(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) throw new InvalidArgumentError('must be between 0 and 1');
  return parsed;
}

program
  .name('memex')
  .description('Command-line client for your Memex knowledge base')
  .version(packageJson.version)
  .exitOverride((error) => { throw error; });

program.command('login').description('Configure the Memex backend and API token').action(login);
program.command('logout').description('Remove the stored API token').action(logout);
program.command('add <path>').description('Register a Markdown/text file or folder').action(add);
program.command('remove <path>').description('Unregister a source and delete its indexed documents').action(remove);
program.command('list').description('List registered sources and indexed documents').action(list);
program.command('index').description('Index new and changed files and remove stale documents').action(index);
program.command('reindex').description('Rebuild the backend embedding collection').action(reindex);
program.command('search <query>')
  .description('Search indexed notes')
  .option('-k, --top-k <count>', 'number of results', positiveInteger)
  .option('--min-score <score>', 'minimum similarity score', score)
  .option('--json', 'write machine-readable results')
  .action((query, options) => search(query, { topK: options.topK, minScore: options.minScore, json: options.json }));
program.command('status').description('Show backend health and index statistics').action(status);

try {
  await program.parseAsync(process.argv);
} catch (error) {
  if (error instanceof CommanderError) process.exitCode = error.exitCode;
  else {
    console.error(error instanceof Error ? error.message : 'Unexpected error.');
    process.exitCode = 1;
  }
}
