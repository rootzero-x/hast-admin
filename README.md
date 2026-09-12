# HAST — boshqaruv paneli

`admin.hast.uz`. The administration console for HAST: the payment queue, the
reports queue, every table in the database, who may touch which of them, and an
audit trail of who did.

React 19 · TypeScript (strict) · Vite · Tailwind.

## Running it

```
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/
```

## Where it points

The API is a separate PHP application on its own host, not part of this
repository. The base address is compiled in with a working default, so a fresh
clone runs without a `.env`:

```
VITE_API_BASE          https://api.hast.uz/api/v1
VITE_GOOGLE_CLIENT_ID   (the Google sign-in client; a default is compiled in)
```

Set them in Vercel under Settings → Environment Variables to point a preview at
somewhere else.

## Deployment

One Vercel project, this repository, no Root Directory to set — the application
is at the repository root. `vercel.json` carries the SPA rewrite and the
security headers, including a Content-Security-Policy that only allows the API
and Google's sign-in script.

The panel is `noindex` and always will be: it is a door, not a page.

## Getting in

Two factors, always. First a door — Google for `rootzero.xz@gmail.com`, or
Telegram for an allow-listed account — then a six-digit code from an
authenticator app. The server issues a five-minute single-use challenge between
the two, so neither half is any use alone.

Nothing in this repository is a security control. Every permission the interface
appears to enforce is enforced again on the server; the panel hides what an
account cannot use so that no button ever produces a 403 when pressed.

## Keyboard

`Ctrl K` (`⌘K`) opens the command palette from anywhere — type a few letters of
a page name and press enter. It only ever lists what the signed-in account is
allowed to reach.

## The public site

Separate repository, separate Vercel project: `rootzero-x/hast-web` serves
`hast.uz`. The two share a brand and nothing else — deliberately. This is a
dense, flat, dark tool; that is a light product page.
