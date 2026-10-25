// Dashboard theming. The restaurant saves 3 colors in Settings -> Admin
// Dashboard (dashboard_primary/secondary/background_color). This turns them
// into the full set of CSS variables the UI reads, deriving contrast and
// neutral shades automatically so any color choice stays readable.

export interface DashboardTheme {
  primary: string;
  secondary: string;
  background: string;
}

export const DEFAULT_THEME: DashboardTheme = {
  primary: '#111111',
  secondary: '#E4E4E0',
  background: '#ECECE9',
};

type RGB = [number, number, number];
const BLACK: RGB = [0, 0, 0];

function parseHex(input?: string | null): RGB | null {
  if (!input) return null;
  let h = input.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] * (1 - t) + b[0] * t),
    Math.round(a[1] * (1 - t) + b[1] * t),
    Math.round(a[2] * (1 - t) + b[2] * t),
  ];
}

const channels = (c: RGB) => c.join(' ');

export function applyDashboardTheme(theme: {
  primary?: string | null;
  secondary?: string | null;
  background?: string | null;
}) {
  const primary = parseHex(theme.primary) ?? (parseHex(DEFAULT_THEME.primary) as RGB);
  const secondary = parseHex(theme.secondary) ?? (parseHex(DEFAULT_THEME.secondary) as RGB);
  const background = parseHex(theme.background) ?? (parseHex(DEFAULT_THEME.background) as RGB);

  const style = document.documentElement.style;
  style.setProperty('--c-primary', channels(primary));
  style.setProperty('--c-primary-dark', channels(mix(primary, BLACK, 0.25)));
  // Readable text color on top of the primary color, whatever it is.
  style.setProperty('--c-on-primary', luminance(primary) > 0.45 ? '17 17 17' : '255 255 255');
  style.setProperty('--c-secondary', channels(secondary));
  style.setProperty('--c-secondary-deep', channels(mix(secondary, BLACK, 0.1)));
  style.setProperty('--c-canvas', channels(background));
  style.setProperty('--c-line', channels(mix(background, BLACK, 0.12)));
}
