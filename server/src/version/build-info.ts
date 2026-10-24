import type { BuildInfo } from '@eshop/shared';

// Replaced at build time by `npm run build:ssr` (scripts/build-ssr.mjs, Angular `define`);
// undefined in `nest start` and tests, hence the `typeof` checks.
declare const ESHOP_VERSION: string | undefined;
declare const ESHOP_SHA: string | undefined;
declare const ESHOP_BUILD_DATE: string | undefined;

/** The running build: package version, short git SHA and build date ("dev" when not built) */
export const buildInfo: BuildInfo = {
  version: typeof ESHOP_VERSION === 'string' ? ESHOP_VERSION : 'dev',
  sha: typeof ESHOP_SHA === 'string' ? ESHOP_SHA : 'dev',
  buildDate: typeof ESHOP_BUILD_DATE === 'string' ? ESHOP_BUILD_DATE : 'dev',
};
