/**
 * Everything that talks to the server.
 *
 * One file, because there is exactly one rule that matters and it should be
 * impossible to bypass by accident: the panel's credential goes in
 * `X-Admin-Token` and nowhere else, and a 401 means the session is finished
 * rather than "this call failed".
 *
 * Nothing here is a security control. Every check the interface appears to make
 * is made again by the server — see AdminMiddleware in the API. The panel hides
 * what it cannot use so that no button produces a 403 when pressed; it is not
 * what stops anybody.
 */

/**
 * Where the API lives.
 *
 * Configurable so a local build can point at a staging server, but with a real
 * default: a fresh clone should work without a `.env` file that somebody has to
 * be told about.
 */
export const API_BASE: string =
  import.meta.env.VITE_API_BASE ?? 'https://api.hast.uz/api/v1';

const TOKEN_KEY = 'hast.admin.token';

/**
 * The token lives in `sessionStorage`, so it dies with the tab.
 *
 * Not `localStorage`: a credential that can rewrite any row in the database
 * should not outlive the window it was typed into, and certainly should not sit
 * on disk waiting for the next person to open the browser.
 */
export const session = {
  get(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      // Private browsing, or storage disabled. Signing in again each time is a
      // nuisance; failing to load at all is worse.
      return null;
    }
  },

  set(token: string): void {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* not fatal - see above */
    }
  },

  clear(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* not fatal */
    }
  },
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string = 'error',
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The session is finished - expired, revoked, or the account demoted. */
  get isExpiredSession(): boolean {
    return this.status === 401;
  }
}

type Envelope<T> = {
  ok: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: { code?: string; message?: string };
};

/** Called when any request finds the session gone. Set once, by the app. */
let onSessionLost: (() => void) | null = null;

export function whenSessionLost(handler: () => void): void {
  onSessionLost = handler;
}

export interface ApiOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Sign-in calls have no token yet and must not trigger the lost-session path. */
  anonymous?: boolean;
}

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<Envelope<T>> {
  const url = new URL(API_BASE + path);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = session.get();

  if (token && !options.anonymous) headers['X-Admin-Token'] = token;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    // A network failure and a server failure need different words: one asks the
    // user to check their connection, the other asks them to tell somebody.
    throw new ApiError('Serverga ulanib boʻlmadi', 0, 'network');
  }

  let payload: Envelope<T> | null = null;

  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    // Not JSON. Almost always the host answering with its own error page,
    // which means the request never reached the application at all.
    throw new ApiError(
      response.status === 500
        ? 'Server javob bermadi. Bu hosting nosozligi boʻlishi mumkin.'
        : `Kutilmagan javob (HTTP ${response.status})`,
      response.status,
      'bad_response',
    );
  }

  if (response.ok && payload.ok) return payload;

  if (response.status === 401 && !options.anonymous) {
    session.clear();
    onSessionLost?.();
  }

  throw new ApiError(
    payload.error?.message ?? `Xatolik (HTTP ${response.status})`,
    response.status,
    payload.error?.code ?? 'error',
  );
}

/**
 * Fetches a file that needs the admin header.
 *
 * Receipts cannot be dropped into an `<img src>`: the endpoint requires
 * `X-Admin-Token` and a browser will not send a custom header on an image
 * request. So it is fetched and turned into a blob URL, which the caller must
 * revoke - the picture has no business lingering in memory after the dialog
 * that showed it has closed.
 */
export async function fetchBlobUrl(path: string): Promise<string> {
  const token = session.get();

  const response = await fetch(API_BASE + path, {
    headers: token ? { 'X-Admin-Token': token } : {},
  });

  if (!response.ok) throw new ApiError('Faylni ochib boʻlmadi', response.status);

  return URL.createObjectURL(await response.blob());
}
