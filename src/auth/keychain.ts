const service = 'Memex-CLI';
const account = 'api-token';

export interface Keychain {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

async function adapter(): Promise<Keychain> {
  try {
    return await import('keytar');
  } catch {
    throw new Error('OS keychain support is unavailable. Set MEMEX_TOKEN or install the platform keychain dependencies.');
  }
}

export async function getToken(): Promise<string> {
  if (process.env.MEMEX_TOKEN) return process.env.MEMEX_TOKEN;
  const token = await (await adapter()).getPassword(service, account);
  if (!token) throw new Error('No API token configured. Run `memex login` or set MEMEX_TOKEN.');
  return token;
}

export async function setToken(token: string): Promise<void> {
  await (await adapter()).setPassword(service, account, token);
}

export async function deleteToken(): Promise<boolean> {
  if (process.env.MEMEX_TOKEN) return false;
  return (await adapter()).deletePassword(service, account);
}
