/**
 * The API HTTP layer.
 *
 * Pure helpers (`joinUrl`, `parseApiError`) are split out and unit-tested; the
 * `ApiClient` wraps `fetch` with the base URL, bearer token, correlation id and
 * the backend's single error envelope. One error shape reaches the UI, so
 * screens branch on a stable `code`, never on a raw message.
 */

export interface ApiErrorShape {
  statusCode: number;
  code: string;
  message: string;
  details?: string[];
  correlationId?: string;
}

/** A thrown API error carrying the backend envelope (or a synthesised network one). */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: string[];

  constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = "ApiError";
    this.statusCode = shape.statusCode;
    this.code = shape.code;
    this.details = shape.details;
  }

  /** True when the failure is a lost/again-able connection rather than a real 4xx/5xx. */
  get isNetwork(): boolean {
    return this.code === "NETWORK";
  }
}

/**
 * What a failed `fetch` actually means, in words that do not send a driver to
 * check a connection that is fine.
 *
 * Every throw used to become **"No connection. Check your network and try
 * again."** That message is right about a fifth of the time. `fetch` throws the
 * same opaque `TypeError` for a lost signal, a DNS failure, a TLS failure, a
 * server that is down and — on the web build, which is how this app is
 * deployed — **a request the API's CORS allow-list refused**. A browser
 * deliberately hides the CORS reason from JavaScript, so the app cannot read it
 * off the error; what it *can* read is whether the device has a network at all.
 *
 * So: if the device says it is online and the request still failed, this is our
 * problem, not the driver's, and the message says so. Blaming the driver's
 * signal for our own misconfiguration is what makes a fault like this take a
 * day to find instead of a minute.
 *
 * `online` is passed in rather than read from `navigator` so the rule is pure
 * and testable. `null` means "we cannot tell" — a native build has no
 * `navigator.onLine` — and falls back to the cautious wording.
 */
export function networkErrorMessage(error: unknown, online: boolean | null): string {
  const raw = error instanceof Error ? `${error.name} ${error.message}` : '';

  if (/abort|timeout/i.test(raw)) {
    return 'The server took too long to answer. Try again.';
  }

  if (online === true) {
    // The device has a network and the request still did not land. On the web
    // build the browser console names the real cause (very often a CORS block);
    // saying so is what turns this into a five-minute fix.
    return 'Your device is online but the app could not reach the server. This is a problem at our end, not with your connection.';
  }

  return 'No connection. Check your network and try again.';
}

/** `navigator.onLine` where there is one — a browser. Null on a native build. */
function deviceOnline(): boolean | null {
  const nav = (globalThis as { navigator?: { onLine?: boolean } }).navigator;
  return typeof nav?.onLine === 'boolean' ? nav.onLine : null;
}

/** Joins a base URL and path with exactly one slash. Pure. */
export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/** Normalises any failure body into the error envelope. Pure. */
export function parseApiError(status: number, body: unknown): ApiErrorShape {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.code === "string" && typeof b.message === "string") {
      return {
        statusCode: typeof b.statusCode === "number" ? b.statusCode : status,
        code: b.code,
        message: b.message,
        details: Array.isArray(b.details) ? (b.details as string[]) : undefined,
        correlationId:
          typeof b.correlationId === "string" ? b.correlationId : undefined,
      };
    }
  }
  return {
    statusCode: status,
    code: status >= 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED",
    message: "Something went wrong. Please try again.",
  };
}

export interface TokenProvider {
  getAccessToken: () => string | null;
  /** Called on a 401 to attempt a refresh; returns true if a new token is ready. */
  onUnauthorized: () => Promise<boolean>;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Skip the bearer token (public endpoints). */
  public?: boolean;
  signal?: AbortSignal;
}

/**
 * How long to wait for the API before giving up.
 *
 * Without a deadline a hung connection leaves the screen spinning for ever
 * with no error and no retry — `fetch` has no timeout of its own, so the
 * request simply never settles. 15 seconds is longer than any healthy call
 * here and short enough that a person has not yet decided the app is broken.
 */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Runs `fetch` with a deadline, and reports a timeout as the same NETWORK
 * failure every screen already handles — "no connection" is what a request
 * that never answered means to the person waiting.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly tokens: TokenProvider,
  ) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const doFetch = (): Promise<Response> => {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (options.body !== undefined) {
        headers["Content-Type"] = "application/json";
      }
      const token = options.public ? null : this.tokens.getAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      return fetchWithTimeout(joinUrl(this.baseUrl, path), {
        method: options.method ?? "GET",
        headers,
        body:
          options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
      });
    };

    let response: Response;
    try {
      response = await doFetch();
    } catch (error) {
      throw new ApiError({
        statusCode: 0,
        code: "NETWORK",
        message: networkErrorMessage(error, deviceOnline()),
      });
    }

    // One retry after a successful token refresh on 401.
    if (response.status === 401 && !options.public) {
      const refreshed = await this.tokens.onUnauthorized();
      if (refreshed) {
        try {
          response = await doFetch();
        } catch (error) {
          throw new ApiError({
            statusCode: 0,
            code: "NETWORK",
            message: networkErrorMessage(error, deviceOnline()),
          });
        }
      }
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    const json: unknown = text ? safeParse(text) : undefined;

    if (!response.ok) {
      throw new ApiError(parseApiError(response.status, json));
    }
    return json as T;
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
