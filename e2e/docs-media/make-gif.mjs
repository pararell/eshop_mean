// Turns docs/images/ai-demo.webm (from readme-media.spec.ts) into docs/images/ai-demo.gif.
// Needs ffmpeg on the PATH; skips with a note otherwise.
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const images = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../docs/images');
const video = resolve(images, 'ai-demo.webm');
const gif = resolve(images, 'ai-demo.gif');

if (!existsSync(video)) {
  console.error(`No ${video}; run the media spec first.`);
  process.exit(1);
}
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  console.warn('ffmpeg not found: keeping the .webm, no GIF made.');
  process.exit(0);
}

// 8 fps, 900 px wide, palette for a small, sharp GIF
const filter = 'fps=8,scale=900:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4';
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-vf', filter, gif], { stdio: 'inherit' });
rmSync(video);
console.log(`Wrote ${gif}`);
