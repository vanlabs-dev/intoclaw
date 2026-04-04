import type {
  TaoSwapSubnetListResponse,
  TaoSwapSubnetDetail,
  TaoSwapSubnetHistoryResponse,
  TaoSwapSubnet,
  TaoSwapMetagraphResponse,
  TaoSwapValidatorListResponse,
  TaoSwapValidator,
  TaoSwapValidatorDetail,
  TaoSwapValidatorHistoryResponse,
  TaoSwapPriceHistoryResponse,
  TaoSwapSubnetPriceHistoryResponse,
  TaoSwapHomeStats,
  TaoSwapHalvingState,
  TaoSwapIdentitiesResponse,
  TaoSwapEventsResponse,
  TaoSwapExtrinsicsResponse,
  TaoSwapExtrinsicCounts,
  TaoSwapSearchResponse,
} from "../types/taoswap.js";

const BASE_URL = "https://api.taoswap.org";
const CACHE_TTL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 2_000;

export class TaoSwapApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "TaoSwapApiError";
  }
}

export class TaoSwapNotFoundError extends TaoSwapApiError {
  constructor(message: string) {
    super(message, 404);
    this.name = "TaoSwapNotFoundError";
  }
}

export class TaoSwapRateLimitError extends TaoSwapApiError {
  constructor() {
    super("TaoSwap API rate limit reached. Try again in a few seconds.", 429);
    this.name = "TaoSwapRateLimitError";
  }
}

export class TaoSwapUnavailableError extends TaoSwapApiError {
  constructor(message: string) {
    super(message, 503);
    this.name = "TaoSwapUnavailableError";
  }
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class TaoSwapClient {
  private cache = new Map<string, CacheEntry<unknown>>();

  private getCached<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  clearCache(): void {
    this.cache.clear();
  }

  async fetch<T>(path: string, bypassCache = false): Promise<T> {
    const url = `${BASE_URL}${path}`;

    if (!bypassCache) {
      const cached = this.getCached<T>(url);
      if (cached !== undefined) return cached;
    }

    const result = await this.fetchWithRetry<T>(url);
    this.setCache(url, result);
    return result;
  }

  private async fetchWithRetry<T>(url: string, retried = false): Promise<T> {
    let res: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      res = await globalThis.fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unknown network error";
      throw new TaoSwapUnavailableError(
        `Could not reach TaoSwap API: ${msg}. Check your network connection.`,
      );
    }

    if (res.status === 429) {
      if (!retried) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        return this.fetchWithRetry<T>(url, true);
      }
      throw new TaoSwapRateLimitError();
    }

    if (res.status === 404) {
      throw new TaoSwapNotFoundError(
        "Resource not found on TaoSwap. Check that the subnet ID is valid.",
      );
    }

    if (res.status >= 500) {
      throw new TaoSwapUnavailableError(
        `TaoSwap API returned ${res.status}. The service may be temporarily down.`,
      );
    }

    if (!res.ok) {
      throw new TaoSwapApiError(
        `TaoSwap API returned ${res.status}.`,
        res.status,
      );
    }

    let data: T;
    try {
      data = (await res.json()) as T;
    } catch {
      throw new TaoSwapApiError(
        "TaoSwap API returned invalid JSON. The service may be having issues.",
        res.status,
      );
    }

    return data;
  }

  async getSubnets(): Promise<TaoSwapSubnet[]> {
    const response =
      await this.fetch<TaoSwapSubnetListResponse>("/subnets/");
    return response.results;
  }

  async getSubnet(netuid: number): Promise<TaoSwapSubnetDetail> {
    return this.fetch<TaoSwapSubnetDetail>(`/subnets/${netuid}/`);
  }

  async getSubnetHistory(
    netuid: number,
    days = 30,
  ): Promise<TaoSwapSubnetHistoryResponse> {
    return this.fetch<TaoSwapSubnetHistoryResponse>(
      `/subnets/${netuid}/history/?days=${days}`,
    );
  }

  async getMetagraph(netuid: number): Promise<TaoSwapMetagraphResponse> {
    return this.fetch<TaoSwapMetagraphResponse>(`/metagraph/${netuid}/`);
  }

  async getValidators(): Promise<TaoSwapValidator[]> {
    const response =
      await this.fetch<TaoSwapValidatorListResponse>("/validators/");
    return response.results;
  }

  async getValidator(id: string): Promise<TaoSwapValidatorDetail> {
    return this.fetch<TaoSwapValidatorDetail>(`/validators/${id}/`);
  }

  async getValidatorHistory(
    id: string,
    days = 30,
  ): Promise<TaoSwapValidatorHistoryResponse> {
    return this.fetch<TaoSwapValidatorHistoryResponse>(
      `/validators/${id}/history/?days=${days}`,
    );
  }

  async getPriceHistory(
    currency = "usd",
    limit = 30,
  ): Promise<TaoSwapPriceHistoryResponse> {
    return this.fetch<TaoSwapPriceHistoryResponse>(
      `/price-history/?currency=${currency}&limit=${limit}`,
    );
  }

  async getSubnetPriceHistory(
    netuid: number,
    resolution = "D",
    limit = 30,
    from?: string,
    to?: string,
  ): Promise<TaoSwapSubnetPriceHistoryResponse> {
    const params = new URLSearchParams({
      netuid: String(netuid),
      resolution,
      limit: String(limit),
    });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return this.fetch<TaoSwapSubnetPriceHistoryResponse>(
      `/subnet-price-history/?${params}`,
    );
  }

  async getHomeStats(): Promise<TaoSwapHomeStats> {
    return this.fetch<TaoSwapHomeStats>("/home-stats/");
  }

  async getHalving(): Promise<TaoSwapHalvingState> {
    return this.fetch<TaoSwapHalvingState>("/halving/");
  }

  async getIdentities(): Promise<TaoSwapIdentitiesResponse> {
    return this.fetch<TaoSwapIdentitiesResponse>("/identities/");
  }

  async getEvents(params: {
    block?: number;
    from_block?: number;
    to_block?: number;
    section?: string;
    method?: string;
    page?: number;
    page_size?: number;
  } = {}): Promise<TaoSwapEventsResponse> {
    const qs = buildQueryString(params);
    return this.fetch<TaoSwapEventsResponse>(`/events/${qs}`);
  }

  async getExtrinsics(params: {
    signer?: string;
    module?: string;
    call?: string;
    category?: string;
    netuid?: number;
    block?: number;
    from_block?: number;
    to_block?: number;
    success?: boolean;
    page?: number;
    page_size?: number;
  } = {}): Promise<TaoSwapExtrinsicsResponse> {
    const qs = buildQueryString(params);
    return this.fetch<TaoSwapExtrinsicsResponse>(`/extrinsics/${qs}`);
  }

  async getExtrinsicCounts(params: {
    account?: string;
    netuid?: number;
  } = {}): Promise<TaoSwapExtrinsicCounts> {
    const qs = buildQueryString(params);
    return this.fetch<TaoSwapExtrinsicCounts>(`/extrinsics/counts/${qs}`);
  }

  async search(query: string): Promise<TaoSwapSearchResponse> {
    return this.fetch<TaoSwapSearchResponse>(
      `/search/?q=${encodeURIComponent(query)}`,
    );
  }
}

function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null,
  );
  if (entries.length === 0) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of entries) {
    qs.set(k, String(v));
  }
  return `?${qs}`;
}

export const taoswap = new TaoSwapClient();
