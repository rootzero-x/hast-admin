/**
 * The panel's design system, expressed once.
 *
 * Spatial UI: the interface is a set of translucent plates floating at
 * different depths above a lit environment, the way visionOS arranges a
 * window. Hierarchy is carried by depth - how far a surface sits from the
 * background, how much light its top edge catches, how far its shadow falls -
 * rather than by lines drawn between things.
 *
 * Two rules keep that from ruining a working tool:
 *
 * Glass is for chrome, never for data. Navigation, the top bar, dialogs and
 * the command palette are glass; the plates holding tables of money are
 * near-opaque, because text over a blurred moving background is harder to read
 * and this panel is mostly numbers somebody is checking against a receipt.
 *
 * Blur is rationed. `backdrop-filter` is the most expensive thing a browser can
 * be asked to composite and it multiplies per layer. A handful of large
 * surfaces blur; a hundred table rows never do.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // The environment: what everything else floats above and refracts.
        env: {
          DEFAULT: '#0B0F14',
          deep: '#070A0E',
        },
        // Plate fills. Alpha rather than solid, so depth reads through them -
        // but high enough that type stays crisp.
        plate: {
          DEFAULT: 'rgba(24,29,38,0.72)',
          raised: 'rgba(32,38,49,0.78)',
          float: 'rgba(38,45,58,0.86)',
        },
        // The lit top edge of a pane, and its shaded counterpart.
        rim: {
          DEFAULT: 'rgba(255,255,255,0.12)',
          bright: 'rgba(255,255,255,0.20)',
          soft: 'rgba(255,255,255,0.07)',
        },
        ink: {
          DEFAULT: '#F2F5F8',
          muted: '#A3ACB9',
          faint: '#727C8A',
        },
        go: '#3DD68C',
        stop: '#FF6B6B',
        warn: '#F5C85C',
        link: '#7FB8FF',
      },
      boxShadow: {
        // The depth ladder. Each step casts wider and softer and catches a
        // brighter top rim, so a raised thing reads as lit from above rather
        // than merely outlined.
        plate: '0 1px 0 0 rgba(255,255,255,0.07) inset, 0 8px 24px -8px rgba(0,0,0,0.55)',
        raised: '0 1px 0 0 rgba(255,255,255,0.10) inset, 0 16px 40px -12px rgba(0,0,0,0.62)',
        float: '0 1px 0 0 rgba(255,255,255,0.14) inset, 0 32px 72px -16px rgba(0,0,0,0.78)',
        // What a control gains on hover: it comes toward the viewer.
        lift: '0 1px 0 0 rgba(255,255,255,0.16) inset, 0 12px 28px -10px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(61,214,140,0.35), 0 12px 32px -10px rgba(61,214,140,0.35)',
      },
      borderRadius: {
        // Generous and consistent. A spatial surface reads as a physical pane,
        // and a pane with tight corners reads as a web page instead.
        pane: '22px',
        card: '16px',
        pill: '11px',
      },
      backdropBlur: {
        pane: '28px',
        card: '14px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'Segoe UI', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fade: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        sheet: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        rise: 'rise 0.22s cubic-bezier(0.22, 1, 0.36, 1) both',
        fade: 'fade 0.18s ease-out both',
        sheet: 'sheet 0.26s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
