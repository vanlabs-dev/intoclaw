import type {
  DesearchWebResponse,
  DesearchTwitterResponse,
} from "../types/desearch.js";

const BASE_URL = "https://api.desearch.ai/desearch/ai/search";
const REQUEST_TIMEOUT_MS = 15_000;
const MIN_COUNT = 10;

export class DesearchNotConfiguredError extends Error {
  constructor() {
    super(
      "Desearch search requires an API key. Set DESEARCH_API_KEY in your .env.local file. Get a key at desearch.ai",
    );
    this.name = "DesearchNotConfiguredError";
  }
}

export class DesearchApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "DesearchApiError";
  }
}

export class DesearchUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DesearchUnavailableError";
  }
}

export function isDesearchAvailable(): boolean {
  return Boolean(process.env.DESEARCH_API_KEY);
}

async function desearchPost<T>(body: Record<string, unknown>): Promise<T> {
  const apiKey = process.env.DESEARCH_API_KEY;
  if (!apiKey) {
    throw new DesearchNotConfiguredError();
  }

  let res: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    res = await globalThis.fetch(BASE_URL, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "User-Agent": "intoclaw/1.0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown network error";
    throw new DesearchUnavailableError(
      `Could not reach Desearch API: ${msg}. Check your network connection.`,
    );
  }

  if (res.status === 401) {
    throw new DesearchApiError(
      "Desearch API key is invalid. Check your DESEARCH_API_KEY in .env.local.",
      401,
    );
  }

  if (res.status === 403) {
    throw new DesearchApiError(
      "Desearch API request was forbidden. Check your API key and request headers.",
      403,
    );
  }

  if (res.status === 429) {
    throw new DesearchApiError(
      "Desearch API rate limit reached. Try again in a few seconds.",
      429,
    );
  }

  if (!res.ok) {
    throw new DesearchApiError(
      `Desearch API returned ${res.status}. The service may be having issues.`,
      res.status,
    );
  }

  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    throw new DesearchApiError(
      "Desearch API returned invalid JSON. The service may be having issues.",
      res.status,
    );
  }

  return data;
}

export async function searchWeb(
  query: string,
  dateFilter?: string,
  count?: number,
): Promise<DesearchWebResponse> {
  return desearchPost<DesearchWebResponse>({
    prompt: query,
    tools: ["web"],
    date_filter: dateFilter || "PAST_WEEK",
    streaming: false,
    result_type: "LINKS_WITH_FINAL_SUMMARY",
    count: String(Math.max(count || 10, MIN_COUNT)),
  });
}

export async function searchTwitter(
  query: string,
  dateFilter?: string,
  count?: number,
): Promise<DesearchTwitterResponse> {
  return desearchPost<DesearchTwitterResponse>({
    prompt: query,
    tools: ["twitter"],
    date_filter: dateFilter || "PAST_WEEK",
    streaming: false,
    result_type: "LINKS_WITH_FINAL_SUMMARY",
    count: String(Math.max(count || 10, MIN_COUNT)),
  });
}
