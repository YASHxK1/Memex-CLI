import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export async function canonicalPath(path: string): Promise<string> {
  return realpath(resolve(path));
}

export async function addablePath(path: string): Promise<string> {
  const requested = resolve(path);
  const requestedInfo = await lstat(requested);
  if (requestedInfo.isSymbolicLink()) throw new Error('Symbolic links cannot be registered as sources.');
  const canonical = await canonicalPath(path);
  const info = await lstat(canonical);
  if (!info.isFile() && !info.isDirectory()) throw new Error(`Source must be a file or directory: ${path}`);
  if (info.isFile() && !['.md', '.txt'].includes(extname(canonical).toLowerCase())) throw new Error('Only .md and .txt files can be added.');
  return canonical;
}

export async function discoverFiles(sources: string[]): Promise<string[]> {
  const found = new Set<string>();
  async function visit(path: string): Promise<void> {
    const info = await lstat(path);
    if (info.isSymbolicLink()) return;
    if (info.isFile()) {
      if (['.md', '.txt'].includes(extname(path).toLowerCase())) found.add(resolve(path));
      return;
    }
    if (!info.isDirectory()) return;
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      await visit(join(path, entry.name));
    }
  }
  for (const source of sources) await visit(source);
  return [...found].sort();
}

export async function fileContent(path: string): Promise<{ content: string; hash: string }> {
  const bytes = await readFile(path);
  return { content: bytes.toString('utf8'), hash: `sha256:${createHash('sha256').update(bytes).digest('hex')}` };
}

export function matchesRoot(path: string, root: string): boolean {
  const rel = relative(resolve(root), resolve(path));
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}
