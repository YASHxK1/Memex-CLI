import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig, saveConfig } from '../src/config.js';
import { discoverFiles, fileContent } from '../src/fs/files.js';
import { ApiClient } from '../src/api/client.js';

const tempDirs: string[] = [];
async function tempDir(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'memex-test-'));
  tempDirs.push(path);
  return path;
}
afterEach(async () => { await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

describe('configuration', () => {
  it('loads defaults, persists settings atomically, and never accepts a token field', async () => {
    const dir = await tempDir();
    const path = join(dir, 'config.json');
    expect((await loadConfig(path)).defaults.topK).toBe(5);
    await saveConfig({ backendUrl: 'http://localhost:8000', sources: ['/notes'], defaults: { topK: 8, minScore: 0.4 } }, path);
    expect(await loadConfig(path)).toMatchObject({ sources: ['/notes'], defaults: { topK: 8, minScore: 0.4 } });
    await expect(saveConfig({ sources: [], defaults: { topK: 5, minScore: 0.3 }, token: 'secret' } as never, path)).rejects.toThrow();
    expect(await readFile(path, 'utf8')).not.toContain('secret');
  });
});

describe('filesystem indexing', () => {
  it('recursively finds Markdown/text files, skips symlinks, and hashes raw bytes', async () => {
    const root = await tempDir();
    await mkdir(join(root, 'nested'));
    await writeFile(join(root, 'nested', 'note.md'), '# Note\n');
    await writeFile(join(root, 'nested', 'ignore.json'), '{}');
    await writeFile(join(root, 'plain.TXT'), 'hello\n');
    await symlink(join(root, 'nested'), join(root, 'linked'));
    const files = await discoverFiles([root]);
    expect(files).toEqual([join(root, 'nested', 'note.md'), join(root, 'plain.TXT')]);
    expect(await fileContent(files[1]!)).toEqual({ content: 'hello\n', hash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/) });
  });
});

describe('backend API client', () => {
  it('sends bearer auth and backend field names, then validates response shapes', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 }));
    const api = new ApiClient('http://localhost:8000', 'secret', fetcher);
    expect(await api.search('hello', 5, 0.3)).toEqual({ results: [] });
    expect(fetcher.mock.calls[0]?.[0]).toBe('http://localhost:8000/v1/search');
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: 'Bearer secret', 'content-type': 'application/json' });
    expect(fetcher.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ query: 'hello', top_k: 5, min_score: 0.3 }));
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ wrong: true }), { status: 200 }));
    await expect(api.search('hello', 5, 0.3)).rejects.toThrow('unexpected shape');
  });

  it('encodes delete paths and sanitizes HTTP failures', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: 'deleted' }), { status: 200 }));
    const api = new ApiClient('http://localhost:8000', 'secret', fetcher);
    await api.delete('/notes/a b.md');
    expect(fetcher.mock.calls[0]?.[0]).toContain('path=%2Fnotes%2Fa%20b.md');
    fetcher.mockResolvedValueOnce(new Response('failure', { status: 401, statusText: 'Unauthorized' }));
    await expect(api.status()).rejects.toThrow('401 Unauthorized');
  });
});
