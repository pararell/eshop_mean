// Turns the full-size PNG screenshots in docs/images/raw (from the media specs) into the WebP files
// the README and docs use. Needs ffmpeg with libwebp on the PATH.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const images = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../docs/images');
const raw = resolve(images, 'raw');

if (!existsSync(raw)) {
  console.error(`No ${raw}; run the media specs first.`);
  process.exit(1);
}

for (const file of readdirSync(raw).filter((f) => f.endsWith('.png'))) {
  const name = file.replace(/\.png$/, '');
  // Only the input for the social preview; not used in the docs
  if (name === 'storefront-photo') continue;
  // Phone shots are taken at 2× and shown at about 300 px: half size is still sharp
  const scale = name.startsWith('mobile') ? ['-vf', 'scale=iw/2:-1:flags=lanczos'] : [];
  const webp = resolve(images, `${name}.webp`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', resolve(raw, file), ...scale, '-c:v', 'libwebp', '-quality', '82', webp], {
    stdio: 'inherit',
  });
  console.log(`Wrote ${webp}`);
}
rmSync(raw, { recursive: true });
