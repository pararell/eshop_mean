// Product photos for the model: only images already uploaded to this shop's Cloudinary account are
// accepted (no arbitrary URLs, so the server can't be used to fetch other hosts), and a resized JPEG
// is requested from Cloudinary instead of resizing on our server.
import type { LlmImage } from './providers/llm-provider';

/** Longest side 1024 px, JPEG, quality 80: enough detail for the model, small and cheap */
export const RESIZE_TRANSFORMATION = 'c_limit,w_1024,h_1024,f_jpg,q_80';

export class ImageInputError extends Error {}

/**
 * Builds the resized delivery URL for an uploaded image, or throws ImageInputError when the URL is
 * not an image of this shop's Cloudinary account.
 */
export function resizedImageUrl(url: string, options: { imageOrigin: string; cloudName: string }): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ImageInputError(`Not a valid image URL: ${url}`);
  }
  const origin = new URL(options.imageOrigin);
  const prefix = `/${options.cloudName}/image/upload/`;
  if (parsed.origin !== origin.origin || !parsed.pathname.startsWith(prefix) || parsed.search || parsed.hash) {
    throw new ImageInputError('Images must be uploaded to the shop first (only this shop’s Cloudinary images are accepted).');
  }
  return `${origin.origin}${prefix}${RESIZE_TRANSFORMATION}/${parsed.pathname.slice(prefix.length)}`;
}

export async function fetchImage(url: string, maxBytes: number, timeoutMs = 15_000): Promise<LlmImage> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
  } catch {
    throw new ImageInputError('Could not download an image from Cloudinary.');
  }
  if (!response.ok) {
    throw new ImageInputError(`Could not download an image from Cloudinary (HTTP ${response.status}).`);
  }
  const mimeType = (response.headers.get('content-type') ?? '').split(';')[0].trim();
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mimeType)) {
    throw new ImageInputError('An uploaded file is not a supported image (JPEG, PNG, WebP or GIF).');
  }
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > maxBytes) {
    throw new ImageInputError(`An image is larger than ${Math.round(maxBytes / 1024 / 1024)} MB after resizing.`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxBytes) {
    throw new ImageInputError(`An image is larger than ${Math.round(maxBytes / 1024 / 1024)} MB after resizing.`);
  }
  return { mimeType, data: buffer.toString('base64') };
}
