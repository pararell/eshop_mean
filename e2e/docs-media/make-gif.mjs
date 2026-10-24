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

// 6 fps, 760 px wide, a small shared palette and only changed pixels per frame: a fast-loading GIF
const filter =
  'fps=6,scale=760:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle';
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-vf', filter, gif], { stdio: 'inherit' });
rmSync(video);
console.log(`Wrote ${gif}`);
