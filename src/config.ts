import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { z } from 'zod';

const ConfigSchema = z.object({
  backendUrl: z.string().url().optional(),
  sources: z.array(z.string()).default([]),
  defaults: z.object({ topK: z.number().int().positive().default(5), minScore: z.number().min(0).max(1).default(0.3) }).default({}),
}).strict();

export type MemexConfig = z.infer<typeof ConfigSchema>;
export const configPath = (): string => join(process.env.MEMEX_CONFIG_DIR ?? join(homedir(), '.memex'), 'config.json');

export async function loadConfig(path = configPath()): Promise<MemexConfig> {
  try {
    return ConfigSchema.parse(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ConfigSchema.parse({});
    if (error instanceof z.ZodError) throw new Error(`Invalid config at ${path}: ${error.issues.map((issue) => issue.message).join('; ')}`);
    if (error instanceof SyntaxError) throw new Error(`Invalid JSON in config at ${path}`);
    throw error;
  }
}

export async function saveConfig(config: MemexConfig, path = configPath()): Promise<void> {
  const parsed = ConfigSchema.parse(config);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, path);
}

export function resolvedBackendUrl(config: MemexConfig): string {
  const value = process.env.MEMEX_BACKEND_URL ?? config.backendUrl;
  if (!value) throw new Error('Backend URL is not configured. Run `memex login` or set MEMEX_BACKEND_URL.');
  return value.replace(/\/+$/, '');
}
