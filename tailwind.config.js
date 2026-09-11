/**
 * The panel's design system, expressed once.
 *
 * Soft UI (neomorphism): every surface is the same colour as its background and
 * exists only because of two shadows — a light one from the top left and a dark
 * one from the bottom right, as though the whole interface were pressed out of a
 * single sheet. Raised things cast outward, pressed things cast inward.
 *
 * The shadows live here rather than being retyped as arbitrary values across
 * fifty components, because the moment two of them differ the illusion of a
 * single sheet breaks and nobody can say why it looks wrong.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // The sheet. Everything is cut from these three.
        base: {
          DEFAULT: '#23262D',
          deep: '#1E2128',
          lift: '#272B33',
        },
        // Type stays high contrast on purpose: the softness belongs to the
        // surfaces, never to the words. Soft UI's usual failing is unreadable
        // text, and this panel is mostly tables of money.
        ink: {
          DEFAULT: '#EEF2F6',
          muted: '#98A2AE',
          faint: '#6E7884',
        },
        go: '#35C27A',
        stop: '#F0625E',
        warn: '#E3B341',
        link: '#6FB4FF',
        hair: 'rgba(255,255,255,0.05)',
      },
      boxShadow: {
        raise: '-5px -5px 12px rgba(255,255,255,0.055), 5px 5px 14px rgba(0,0,0,0.46)',
        'raise-sm': '-3px -3px 7px rgba(255,255,255,0.055), 3px 3px 8px rgba(0,0,0,0.46)',
        press: 'inset -3px -3px 7px rgba(255,255,255,0.055), inset 3px 3px 8px rgba(0,0,0,0.46)',
        'press-sm': 'inset -2px -2px 5px rgba(255,255,255,0.055), inset 2px 2px 6px rgba(0,0,0,0.46)',
      },
      borderRadius: {
        soft: '16px',
        'soft-sm': '11px',
      },
      fontFamily: {
        sans: ['-apple-system', 'Segoe UI', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
