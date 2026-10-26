import { z } from 'zod';

const SearchSchema = z.object({ results: z.array(z.object({ score: z.number(), path: z.string(), heading: z.string().nullable(), chunk_index: z.number().int(), text: z.string() })) });
const SourcesSchema = z.object({ sources: z.array(z.object({ path: z.string(), chunks: z.number().int() })) });
const StatusSchema = z.object({ model: z.string(), vector_dimension: z.number().int(), collection: z.string(), document_count: z.number().int(), chunk_count: z.number().int() });
const DocumentSchema = z.object({ status: z.string(), chunks: z.number().int().optional() });
export type SearchResponse = z.infer<typeof SearchSchema>;
export type SourcesResponse = z.infer<typeof SourcesSchema>;
export type StatusResponse = z.infer<typeof StatusSchema>;
export type SearchResult = SearchResponse['results'][number];

export class ApiClient {
  constructor(private readonly baseUrl: string, private readonly token: string, private readonly fetcher: typeof fetch = fetch, private readonly timeoutMs = 30_000) {}

  private async request<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}, authenticated = true): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(authenticated ? { authorization: `Bearer ${this.token}` } : {}), ...init.headers },
      });
      if (!response.ok) throw new Error(`Backend request failed (${response.status} ${response.statusText}).`);
      let body: unknown;
      try { body = await response.json(); } catch { throw new Error('Backend returned invalid JSON.'); }
      const parsed = schema.safeParse(body);
      if (!parsed.success) throw new Error('Backend returned a response with an unexpected shape.');
      return parsed.data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error(`Backend request timed out after ${this.timeoutMs} ms.`);
      if (error instanceof Error && /Backend request|Backend returned/.test(error.message)) throw error;
      throw new Error('Could not connect to the Memex backend. Check the URL and network connection.');
    } finally { clearTimeout(timer); }
  }

  health(): Promise<{ status: string }> { return this.request('/health', z.object({ status: z.string() }), {}, false); }
  status(): Promise<StatusResponse> { return this.request('/v1/status', StatusSchema); }
  sources(): Promise<SourcesResponse> { return this.request('/v1/sources', SourcesSchema); }
  index(path: string, content: string, hash: string): Promise<z.infer<typeof DocumentSchema>> {
    return this.request('/v1/documents', DocumentSchema, { method: 'POST', body: JSON.stringify({ path, content, hash }) });
  }
  async delete(path: string): Promise<void> {
    await this.request(`/v1/documents?path=${encodeURIComponent(path)}`, z.object({ status: z.string() }), { method: 'DELETE' });
  }
  search(query: string, topK: number, minScore: number): Promise<SearchResponse> {
    return this.request('/v1/search', SearchSchema, { method: 'POST', body: JSON.stringify({ query, top_k: topK, min_score: minScore }) });
  }
  reindex(): Promise<{ status: string; documents: number }> {
    return this.request('/v1/reindex', z.object({ status: z.string(), documents: z.number().int() }), { method: 'POST' });
  }
}
