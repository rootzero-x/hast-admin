/**
 * The panel's design system, expressed once.
 *
 * Liquid glass, in daylight. Surfaces are thin sheets of white glass laid over
 * a softly lit room: they let the colour behind them through, saturate it
 * slightly the way real glass does, catch a bright specular line along their
 * top edge, and drop a soft shadow onto whatever is beneath.
 *
 * Bright rather than dark, and that is the point. This is a tool somebody works
 * in for an hour at a time reading rows of money, and dark type on a light
 * sheet is what the eye does best; the previous dark schemes looked handsome in
 * a screenshot and tiring in use.
 *
 * Two rules keep the material from eating the tool:
 *
 * Glass is for chrome, never for data. Navigation, the top bar, dialogs and the
 * command palette are glass. The sheets that carry tables are nearly opaque,
 * because a number being checked against a paper receipt must not shimmer.
 *
 * Blur is rationed. `backdrop-filter` is the most expensive thing a browser can
 * be asked to composite and it multiplies per layer, so a handful of large
 * surfaces blur and a hundred table rows never do.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // The room the glass is lit by.
        room: {
          DEFAULT: '#EEF2F8',
          deep: '#E4EAF3',
        },
        // Sheet fills: white at three thicknesses.
        sheet: {
          thin: 'rgba(255,255,255,0.62)',
          DEFAULT: 'rgba(255,255,255,0.78)',
          thick: 'rgba(255,255,255,0.92)',
          solid: '#FFFFFF',
        },
        // The specular line along a lit edge, and the hairline that separates
        // two sheets of the same brightness.
        rim: {
          DEFAULT: 'rgba(15,23,42,0.09)',
          soft: 'rgba(15,23,42,0.06)',
          strong: 'rgba(15,23,42,0.14)',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#55627A',
          faint: '#8A95A8',
        },
        go: '#0FA968',
        stop: '#E5484D',
        warn: '#B76E00',
        link: '#2563EB',
      },
      boxShadow: {
        // Every sheet carries the same two ingredients: a white line along the
        // top edge where the light catches, and a soft shadow cast downward.
        glass: '0 1px 0 0 rgba(255,255,255,0.85) inset, 0 6px 20px -8px rgba(15,23,42,0.14)',
        raised: '0 1px 0 0 rgba(255,255,255,0.9) inset, 0 18px 44px -14px rgba(15,23,42,0.20)',
        float: '0 1px 0 0 rgba(255,255,255,0.95) inset, 0 36px 80px -20px rgba(15,23,42,0.32)',
        lift: '0 1px 0 0 rgba(255,255,255,0.9) inset, 0 10px 26px -10px rgba(15,23,42,0.22)',
        glow: '0 0 0 3px rgba(15,169,104,0.16)',
      },
      borderRadius: {
        // Capsule-leaning, the way liquid glass reads: a sheet is a lozenge,
        // not a rectangle with the corners knocked off.
        pane: '24px',
        card: '18px',
        pill: '12px',
      },
      backdropBlur: {
        pane: '30px',
        card: '16px',
      },
      backdropSaturate: {
        glass: '1.8',
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
