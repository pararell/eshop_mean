import type { BuildInfo } from '@eshop/shared';

// Replaced at build time by `npm run build:ssr` (scripts/build-ssr.mjs, Angular `define`);
// undefined in `ng serve`, hence the `typeof` checks.
declare const ESHOP_VERSION: string | undefined;
declare const ESHOP_SHA: string | undefined;
declare const ESHOP_BUILD_DATE: string | undefined;

/** The running build: package version, short git SHA and build date ("dev" when not built) */
export const buildInfo: BuildInfo = {
  version: typeof ESHOP_VERSION === 'string' ? ESHOP_VERSION : 'dev',
  sha: typeof ESHOP_SHA === 'string' ? ESHOP_SHA : 'dev',
  buildDate: typeof ESHOP_BUILD_DATE === 'string' ? ESHOP_BUILD_DATE : 'dev',
};

/** "v1.0.0 · a1b2c3d · 2026-10-24" */
export const buildLabel = (info: BuildInfo = buildInfo): string =>
  `${info.version === 'dev' ? 'dev' : 'v' + info.version} · ${info.sha} · ${info.buildDate}`;

/** One console line per page load, in the browser only (the caller checks the platform) */
export function logBuildInfo(console: Pick<Console, 'info'> = globalThis.console): void {
  console.info(`%cEshop%c ${buildLabel()}`, 'padding:2px 6px;background:#111;color:#fff;font-weight:600', 'color:inherit');
}
