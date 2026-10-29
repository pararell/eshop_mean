// Photo upload for the theme editor (home bands, listing headers and tiles), to the image library
import { firstValueFrom } from 'rxjs';

import { ApiService } from '../../../services/api.service';
import { ACCEPTED, MAX_FILE_BYTES } from '../product-editor/image-gallery/image-gallery.component';

/** Uploads the chosen file to Cloudinary; the upload endpoint answers with the image library, newest last */
export async function uploadPhoto(api: ApiService, file: File): Promise<{ url: string } | { error: string }> {
  if (!ACCEPTED.includes(file.type)) return { error: 'Only JPEG, PNG, WebP or GIF images.' };
  if (file.size > MAX_FILE_BYTES) return { error: 'The photo is larger than 10 MB.' };
  const request = api.uploadImage({ fileToUpload: file });
  const result = request ? await firstValueFrom(request) : undefined;
  const all = (result as { all?: string[] } | undefined)?.all;
  const url = all?.[all.length - 1];
  return !result || result.error || !url ? { error: 'Upload failed. Try again.' } : { url };
}
