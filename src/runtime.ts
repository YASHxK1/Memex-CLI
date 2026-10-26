import { ApiClient } from './api/client.js';
import { loadConfig, resolvedBackendUrl } from './config.js';
import { getToken } from './auth/keychain.js';

export async function runtime(authenticated = true) {
  const config = await loadConfig();
  const url = resolvedBackendUrl(config);
  const token = authenticated ? await getToken() : '';
  return { config, api: new ApiClient(url, token) };
}
