/**
 * MEMORA — Central Brand Identity Configuration (`src/config/brand.ts`)
 *
 * Single source of truth for user-facing brand identity, tagline, and descriptions.
 * Internal persistence keys (`mymuseum_*`), API routes, cookie names, and server
 * data directories remain unchanged to preserve compatibility with existing user data.
 */

export const BRAND = {
  name: 'MEMORA',
  shortName: 'MEMORA',
  tagline: 'Your Life. Your Stories. Your World.',
  description:
    'An immersive personal museum where your photographs, videos, stories and meaningful moments become a world you can explore.',
  browserTitle: 'MEMORA — Your Personal Museum',
  metaDescription:
    'Explore your life through an immersive personal museum of photographs, videos, stories and memories.',
  voice: 'Emotional, premium, personal, cinematic, timeless, and immersive.',
} as const;

const LEGACY_DEFAULT_PROJECT_NAMES = new Set([
  '',
  'mymuseum',
  'my museum',
  'the living museum',
  'memora',
]);

/**
 * Resolves the displayed museum title while respecting any custom name chosen by the user.
 * Uncustomized or legacy default project names resolve cleanly to `BRAND.name` ('MEMORA'),
 * whereas custom user museum titles (e.g., "The Vance Archive") are preserved untouched.
 */
export function resolveMuseumDisplayName(projectName?: string | null): string {
  const trimmed = (projectName || '').trim();
  if (!trimmed || LEGACY_DEFAULT_PROJECT_NAMES.has(trimmed.toLowerCase())) {
    return BRAND.name;
  }
  return trimmed;
}

/**
 * Resolves the browser document title, honoring custom user museum names alongside MEMORA.
 */
export function resolveBrowserTitle(projectName?: string | null): string {
  const resolved = resolveMuseumDisplayName(projectName);
  if (resolved === BRAND.name) {
    return BRAND.browserTitle;
  }
  return `${resolved} — ${BRAND.name}`;
}
