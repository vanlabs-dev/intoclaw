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
}

export const taoswap = new TaoSwapClient();
