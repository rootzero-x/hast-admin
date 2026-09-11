/**
 * Getting into the panel.
 *
 * Two doors and two steps. Google or Telegram proves the address or the number;
 * an authenticator code proves the person is present. Passing the first door
 * yields a five-minute *challenge*, never a session — the session exists only
 * after the six digits, and it is a different credential from the app's own.
 *
 * The enrolment path deserves its own note. An administrator with no
 * authenticator yet is shown the setup key as text rather than a QR code,
 * because the panel is frequently open on the very phone that holds the
 * authenticator, and there is nothing to point a camera at.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { api, ApiError, session } from './api';
import type { Me, SecondFactor } from './types';
import { Button, useToast } from './ui';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ??
  '909273361897-3hdrpq1u4gbbq6pvlvhp6aqj45831kls.apps.googleusercontent.com';

/** Google's script defines this once loaded; typed narrowly rather than `any`. */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (r: { credential: string }) => void }): void;
          renderButton(el: HTMLElement, options: Record<string, unknown>): void;
        };
      };
    };
  }
}

function Mark() {
  return (
    <svg viewBox="0 0 100 100" className="mx-auto mb-5 h-16 w-16 rounded-[20px] p-2 shadow-press-sm">
      <rect width="100" height="100" rx="24" fill="#12A25F" />
      <path
        d="M22 48 L50 26 L78 48"
        fill="none"
        stroke="#fff"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="62" r="7.5" fill="#fff" />
      <circle cx="60" cy="62" r="7.5" fill="#fff" />
    </svg>
  );
}

export function SignIn({ onSignedIn }: { onSignedIn: (me: Me) => void }) {
  const [factor, setFactor] = useState<SecondFactor | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (factor) {
    return (
      <SecondStep
        factor={factor}
        onSignedIn={onSignedIn}
        onBack={() => {
          setFactor(null);
          setError(null);
        }}
      />
    );
  }

  return <FirstStep onFactor={setFactor} error={error} onError={setError} />;
}

/* -------------------------------------------------------------------------- */

function FirstStep({
  onFactor,
  error,
  onError,
}: {
  onFactor: (f: SecondFactor) => void;
  error: string | null;
  onError: (message: string | null) => void;
}) {
  const googleSlot = useRef<HTMLDivElement>(null);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramNote, setTelegramNote] = useState<string | null>(null);

  const handleGoogle = useCallback(
    async (credential: string) => {
      onError(null);

      try {
        const { data } = await api<SecondFactor>('/admin/auth/google', {
          method: 'POST',
          body: { id_token: credential },
          anonymous: true,
        });

        onFactor(data);
      } catch (e) {
        onError(e instanceof ApiError ? e.message : 'Kirib boʻlmadi');
      }
    },
    [onFactor, onError],
  );

  useEffect(() => {
    // Google's script is loaded with `defer`, so it may not be ready when this
    // component first mounts. Polling briefly is less brittle than racing the
    // load event, and gives up rather than spinning forever.
    let cancelled = false;
    let tries = 0;

    const attach = () => {
      if (cancelled || !googleSlot.current) return;

      if (!window.google) {
        if (tries++ < 40) window.setTimeout(attach, 150);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => void handleGoogle(response.credential),
      });

      window.google.accounts.id.renderButton(googleSlot.current, {
        theme: 'filled_black',
        size: 'large',
        width: 320,
        text: 'signin_with',
      });
    };

    attach();

    return () => {
      cancelled = true;
    };
  }, [handleGoogle]);

  const startTelegram = async () => {
    setTelegramBusy(true);
    onError(null);

    try {
      const { data } = await api<{ token: string; deep_link: string; expires_in: number }>(
        '/admin/auth/telegram/start',
        { method: 'POST', body: {}, anonymous: true },
      );

      window.open(data.deep_link, '_blank', 'noopener');
      setTelegramNote('Telegramda raqamingizni tasdiqlang…');

      const deadline = Date.now() + data.expires_in * 1000;

      // Polled rather than pushed: there is no socket here, and the exchange is
      // over in seconds. Two-second ticks are invisible to a person and cost
      // the server one indexed row each.
      const tick = async (): Promise<void> => {
        if (Date.now() > deadline) {
          setTelegramNote('Muddat tugadi. Qaytadan urinib koʻring.');
          setTelegramBusy(false);
          return;
        }

        try {
          const { data: result } = await api<SecondFactor & { status?: string; message?: string }>(
            '/admin/auth/telegram/poll',
            { query: { token: data.token }, anonymous: true },
          );

          if (result.status === 'pending' || result.status === 'started') {
            window.setTimeout(() => void tick(), 2000);
            return;
          }

          if (result.challenge) {
            onFactor(result);
            return;
          }

          setTelegramNote(result.message ?? 'Tasdiqlanmadi.');
          setTelegramBusy(false);
        } catch (e) {
          onError(e instanceof ApiError ? e.message : 'Kirib boʻlmadi');
          setTelegramNote(null);
          setTelegramBusy(false);
        }
      };

      window.setTimeout(() => void tick(), 2000);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Kirib boʻlmadi');
      setTelegramBusy(false);
    }
  };

  return (
    <Gate>
      <Mark />
      <h1 className="mb-1.5 text-xl font-bold tracking-tight">HAST boshqaruv</h1>
      <p className="mb-6 text-[13px] text-ink-muted">Kirish uchun ikkita tasdiq kerak.</p>

      {/* Google draws its own button and will not be restyled, so it is given a
          pressed well to sit in rather than looking pasted on. */}
      <div ref={googleSlot} className="flex min-h-[44px] justify-center rounded-[13px] p-1.5 shadow-press-sm" />

      <div className="relative my-5 text-[11.5px] uppercase tracking-wider text-ink-faint">
        <span className="absolute left-0 top-1/2 h-px w-[calc(50%-28px)] bg-hair" />
        yoki
        <span className="absolute right-0 top-1/2 h-px w-[calc(50%-28px)] bg-hair" />
      </div>

      <Button tone="quiet" busy={telegramBusy} onClick={() => void startTelegram()}>
        Telegram orqali
      </Button>

      {telegramNote && <p className="mt-4 text-[12.5px] text-ink-muted">{telegramNote}</p>}
      {error && <p className="well mt-4 p-3 text-[12.5px] text-stop">{error}</p>}
    </Gate>
  );
}

/* -------------------------------------------------------------------------- */

function SecondStep({
  factor,
  onSignedIn,
  onBack,
}: {
  factor: SecondFactor;
  onSignedIn: (me: Me) => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  const submit = useCallback(
    async (value: string) => {
      if (value.length !== 6 || busy) return;

      setBusy(true);
      setError(null);

      try {
        const { data } = await api<{ token: string; user: Me }>('/admin/auth/totp', {
          method: 'POST',
          body: { challenge: factor.challenge, code: value },
          anonymous: true,
        });

        session.set(data.token);
        onSignedIn(data.user);
      } catch (e) {
        const message = e instanceof ApiError ? e.message : 'Kod notoʻgʻri';
        setError(message);
        setCode('');
        input.current?.focus();

        // A challenge is single use, so a spent one means starting over rather
        // than guessing again - which is exactly what makes it single use.
        if (/muddat|topilmadi/i.test(message)) window.setTimeout(onBack, 1400);
      } finally {
        setBusy(false);
      }
    },
    [busy, factor.challenge, onSignedIn, onBack],
  );

  return (
    <Gate>
      <h1 className="mb-1.5 text-xl font-bold">
        {factor.stage === 'enrol' ? 'Authenticator sozlash' : 'Authenticator kodi'}
      </h1>
      <p className="mb-6 text-[13px] text-ink-muted">{factor.message}</p>

      {factor.stage === 'enrol' && factor.secret && (
        <div className="mb-5">
          <p className="mb-3 text-[13px] text-ink-muted">
            Google Authenticator → <b>+</b> → <b>Enter a setup key</b>
          </p>
          <div className="well my-4 break-all p-4 font-mono text-[15px] leading-loose tracking-[2.5px] text-go">
            {factor.secret_formatted ?? factor.secret}
          </div>
          <Button
            tone="quiet"
            onClick={() => {
              void navigator.clipboard
                .writeText((factor.secret ?? '').replace(/\s/g, ''))
                .then(() => toast('Nusxalandi'))
                .catch(() => toast('Nusxalab boʻlmadi', true));
            }}
          >
            Kalitni nusxalash
          </Button>
        </div>
      )}

      <input
        ref={input}
        value={code}
        inputMode="numeric"
        maxLength={6}
        autoComplete="one-time-code"
        placeholder="000000"
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '').slice(0, 6);
          setCode(digits);
          if (digits.length === 6) void submit(digits);
        }}
        className="my-5 w-full rounded-soft-sm bg-base p-4 text-center font-mono text-[27px] font-bold tracking-[11px] text-ink shadow-press outline-none focus:ring-2 focus:ring-go/35"
      />

      <Button busy={busy} onClick={() => void submit(code)}>
        Kirish
      </Button>

      {error && <p className="well mt-4 p-3 text-[12.5px] text-stop">{error}</p>}

      <button onClick={onBack} className="mt-4 text-[13px] text-link hover:underline">
        Orqaga
      </button>
    </Gate>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="surface w-full max-w-[400px] px-8 py-9 text-center">{children}</div>
    </div>
  );
}
