import { input, password } from '@inquirer/prompts';
import { lstat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { loadConfig, saveConfig } from './config.js';
import { deleteToken, setToken } from './auth/keychain.js';
import { addablePath, discoverFiles, fileContent, matchesRoot } from './fs/files.js';
import { ApiClient } from './api/client.js';
import { runtime } from './runtime.js';

export async function login(options: { backendUrl?: string; token?: string } = {}): Promise<void> {
  const config = await loadConfig();
  const backendUrl = options.backendUrl ?? await input({ message: 'Memex backend URL', default: config.backendUrl ?? 'http://localhost:8000' });
  const token = options.token ?? await password({ message: 'Memex API token' });
  if (!token.trim()) throw new Error('API token cannot be empty.');
  const api = new ApiClient(backendUrl.replace(/\/+$/, ''), token);
  await api.status();
  await setToken(token);
  await saveConfig({ ...config, backendUrl: backendUrl.replace(/\/+$/, '') });
  console.log('Memex login successful.');
}

export async function logout(): Promise<void> {
  const removed = await deleteToken();
  console.log(removed ? 'Stored API token removed.' : 'No stored API token found.');
}

export async function add(path: string): Promise<void> {
  const canonical = await addablePath(path);
  const config = await loadConfig();
  if (config.sources.includes(canonical)) { console.log(`Source already registered: ${canonical}`); return; }
  config.sources.push(canonical);
  await saveConfig(config);
  console.log(`Added source: ${canonical}`);
}

export async function remove(path: string): Promise<void> {
  const target = resolve(path);
  const config = await loadConfig();
  const canonical = await addablePath(path).catch(() => target);
  const source = config.sources.find((item) => resolve(item) === canonical || item === path);
  if (!source) throw new Error(`Source is not registered: ${path}`);
  const { api } = await runtime();
  const entries = (await api.sources()).sources;
  const info = await lstat(source).catch(() => undefined);
  const directory = info?.isDirectory() ?? entries.some((entry) => matchesRoot(entry.path, canonical) && resolve(entry.path) !== canonical);
  const victims = entries.map((entry) => entry.path).filter((documentPath) => {
    const candidate = resolve(documentPath);
    return directory ? candidate === canonical || candidate.startsWith(`${canonical}${sep}`) : candidate === canonical;
  });
  const deleted: string[] = [];
  try {
    for (const victim of victims) { await api.delete(victim); deleted.push(victim); }
  } catch (error) {
    throw new Error(`Could not remove indexed documents; source remains registered so cleanup can be retried. ${error instanceof Error ? error.message : ''}`);
  }
  config.sources = config.sources.filter((item) => item !== source);
  await saveConfig(config);
  console.log(`Removed source: ${source} (${deleted.length} indexed documents deleted)`);
}

export async function list(): Promise<void> {
  const { config, api } = await runtime();
  const { sources } = await api.sources();
  console.log('Registered sources:');
  if (!config.sources.length) console.log('  (none)');
  for (const source of config.sources) console.log(`  ${source}`);
  console.log('\nIndexed documents:');
  if (!sources.length) console.log('  (none)');
  for (const source of sources) console.log(`  ${source.path} (${source.chunks} chunks)`);
}

export async function index(): Promise<void> {
  const { config, api } = await runtime();
  if (!config.sources.length) throw new Error('No sources registered. Add one with `memex add <path>`.');
  const files = new Set<string>();
  const scannedSources: string[] = [];
  let failed = 0;
  for (const source of config.sources) {
    try {
      for (const path of await discoverFiles([source])) files.add(path);
      scannedSources.push(source);
    }
    catch (error) {
      failed++;
      console.error(`Failed to scan ${source}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
  const discoveredFiles = [...files].sort();
  const known = new Set((await api.sources()).sources.map((source) => resolve(source.path)));
  const current = new Set(discoveredFiles.map((path) => resolve(path)));
  let indexed = 0, unchanged = 0, deleted = 0;
  for (const path of discoveredFiles) {
    try {
      const { content, hash } = await fileContent(path);
      const result = await api.index(path, content, hash);
      if (result.status === 'unchanged') unchanged++; else indexed++;
    } catch (error) { failed++; console.error(`Failed to index ${path}: ${error instanceof Error ? error.message : 'unknown error'}`); }
  }
  for (const path of known) {
    const underSource = scannedSources.some((source) => matchesRoot(path, source));
    if (underSource && !current.has(path)) {
      try { await api.delete(path); deleted++; }
      catch (error) { failed++; console.error(`Failed to delete stale document ${path}: ${error instanceof Error ? error.message : 'unknown error'}`); }
    }
  }
  console.log(`Discovered ${discoveredFiles.length}; indexed ${indexed}; unchanged ${unchanged}; deleted ${deleted}; failed ${failed}.`);
  if (failed) throw new Error(`${failed} file operation(s) failed.`);
}

export async function search(query: string, options: { topK?: number; minScore?: number; json?: boolean } = {}): Promise<void> {
  const { config, api } = await runtime();
  const topK = options.topK ?? config.defaults.topK;
  const minScore = options.minScore ?? config.defaults.minScore;
  const response = await api.search(query, topK, minScore);
  if (options.json) { console.log(JSON.stringify(response)); return; }
  if (!response.results.length) { console.log('No matching results.'); return; }
  response.results.forEach((result, index) => {
    console.log(`[${index + 1}] score=${result.score.toFixed(2)}  ${result.path}  (chunk ${result.chunk_index}${result.heading ? `, ${result.heading}` : ''})`);
    console.log(result.text);
    console.log();
  });
}

export async function status(): Promise<void> {
  const { api } = await runtime();
  const health = await api.health();
  const info = await api.status();
  console.log(`Backend: ${health.status}`);
  console.log(`Model: ${info.model}`);
  console.log(`Vector dimension: ${info.vector_dimension}`);
  console.log(`Collection: ${info.collection}`);
  console.log(`Documents: ${info.document_count}`);
  console.log(`Chunks: ${info.chunk_count}`);
}

export async function reindex(): Promise<void> {
  const { api } = await runtime();
  const result = await api.reindex();
  console.log(`Reindexed ${result.documents} documents.`);
}
