import type { ImageLoaderConfig } from '@angular/common';

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/**
 * Image URLs for NgOptimizedImage. Cloudinary (where product and theme images are uploaded) resizes
 * and converts on the fly: `w_` the requested width, `f_auto` WebP/AVIF when the browser takes it,
 * `q_auto` a quality fitting the picture. Any other URL is used as it is.
 */
export function shopImageLoader({ src, width }: ImageLoaderConfig): string {
  const match = CLOUDINARY_UPLOAD.exec(src);
  if (!match) return src;
  const transformations = ['f_auto', 'q_auto', ...(width ? [`w_${width}`, 'c_limit'] : [])].join(',');
  return `${match[1]}${transformations}/${match[2]}`;
}
