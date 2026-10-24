// npm run build:ssr: the production build (client + SSR + bundled API) with the build info
// (version, short git SHA, build date) compiled in as constants. See client/src/app/build-info.ts
// and server/src/version/build-info.ts.
//   GIT_SHA / BUILD_DATE: set by the Docker build (the image has no .git); otherwise taken from git
//   and today's date, or "dev" when git is not available.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

function gitSha() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'dev';
  }
}

const info = {
  ESHOP_VERSION: version,
  ESHOP_SHA: process.env.GIT_SHA?.trim().slice(0, 12) || gitSha(),
  ESHOP_BUILD_DATE: process.env.BUILD_DATE?.trim() || new Date().toISOString().slice(0, 10),
};
console.log(`Build info: v${info.ESHOP_VERSION} · ${info.ESHOP_SHA} · ${info.ESHOP_BUILD_DATE}`);

const defines = Object.entries(info).flatMap(([key, value]) => ['--define', `${key}=${JSON.stringify(value)}`]);
const result = spawnSync('npx', ['ng', 'build', '--configuration', 'production', ...defines], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
});
process.exit(result.status ?? 1);
