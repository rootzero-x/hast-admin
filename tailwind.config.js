/**
 * The panel's design system, expressed once.
 *
 * A flat, dark console: surfaces are separated by a one-pixel edge and a small
 * step in lightness, never by a shadow. Nothing is raised, nothing is pressed,
 * nothing pretends to be a physical object.
 *
 * That is a deliberate reversal of what this file used to hold. Soft shadows
 * read as craft on a landing page and as noise in a tool: this panel is mostly
 * dense tables of money, and every soft edge costs contrast the numbers need.
 * Depth here is carried by exactly two things - a lighter surface and a sharper
 * border - so a row, a panel and a dialog are told apart instantly.
 *
 * The token names are unchanged from the previous scheme on purpose, so the
 * views did not all have to be rewritten in order to be restyled.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: {
          DEFAULT: '#16181D', // panels, the default surface
          deep: '#101114', // the application ground, behind everything
          lift: '#1C1F26', // hover, selected rows, inputs
        },
        // One pixel of edge does the work the shadows used to.
        edge: {
          DEFAULT: '#23262D',
          soft: '#1D2027',
          bright: '#2E323B',
        },
        // Type stays high contrast: the restraint belongs to the surfaces,
        // never to the words.
        ink: {
          DEFAULT: '#E6E8EB',
          muted: '#9096A0',
          faint: '#6B717C',
        },
        go: '#35C27A',
        stop: '#F0625E',
        warn: '#E3B341',
        link: '#6FB4FF',
        hair: 'rgba(255,255,255,0.06)',
      },
      boxShadow: {
        // The only shadows left are the two describing something genuinely
        // floating above the page rather than moulded out of it.
        pop: '0 16px 40px -12px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07)',
        sheet: '0 24px 64px -16px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.08)',
      },
      borderRadius: {
        // Tighter than the old scheme. A console reads as precise; generous
        // corners make a dense table look like a row of pills.
        soft: '10px',
        'soft-sm': '7px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'Segoe UI', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      keyframes: {
        pop: {
          '0%': { opacity: '0', transform: 'translateY(-6px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        pop: 'pop 0.13s cubic-bezier(0.22, 1, 0.36, 1) both',
        fade: 'fade 0.13s ease-out both',
      },
    },
  },
  plugins: [],
};
