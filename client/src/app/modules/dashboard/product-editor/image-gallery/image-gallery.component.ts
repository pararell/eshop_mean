import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';

import { ApiService } from '../../../../services/api.service';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface Upload {
  id: number;
  name: string;
  preview: string;
}

/**
 * Product photos: drop or pick files (uploaded to Cloudinary right away), reorder, choose the main
 * image, remove, or add by URL. The list is only saved with the product.
 */
@Component({
  selector: 'app-image-gallery',
  templateUrl: './image-gallery.component.html',
  styleUrls: ['./image-gallery.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDropList, CdkDrag, FormsModule, MatButton, MatIconButton, MatIcon, MatFormField, MatLabel, MatHint, MatInput, MatProgressSpinner],
})
export class ImageGalleryComponent {
  private api = inject(ApiService);

  readonly images = input<string[]>([]);
  readonly mainImage = input('');
  /** How many leading photos the AI looks at (0 hides the hint) */
  readonly aiImageCount = input(0);
  readonly disabled = input(false);

  readonly imagesChange = output<string[]>();
  readonly mainImageChange = output<string>();
  readonly uploadingChange = output<boolean>();

  readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  readonly uploads = signal<Upload[]>([]);
  readonly errors = signal<string[]>([]);
  readonly dragOver = signal(false);
  readonly status = signal('');
  imageUrl = '';
  private nextId = 0;

  openPicker(): void {
    if (!this.disabled()) this.fileInput().nativeElement.click();
  }

  onFilesPicked(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    void this.addFiles(Array.from(inputEl.files ?? []));
    inputEl.value = '';
  }

  onDragOver(event: DragEvent): void {
    if (this.disabled() || !event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    if (!this.disabled()) void this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  /** Uploads one by one: the upload endpoint answers with the whole image library, newest last */
  async addFiles(files: File[]): Promise<void> {
    const errors: string[] = [];
    const valid = files.filter((file) => {
      if (!ACCEPTED.includes(file.type)) {
        errors.push(`${file.name}: only JPEG, PNG, WebP or GIF images.`);
        return false;
      }
      if (file.size > MAX_FILE_BYTES) {
        errors.push(`${file.name}: larger than 10 MB.`);
        return false;
      }
      return true;
    });
    this.errors.set(errors);
    if (!valid.length) return;

    const pending = valid.map((file) => ({ id: this.nextId++, name: file.name, preview: URL.createObjectURL(file) }));
    this.uploads.update((list) => [...list, ...pending]);
    this.uploadingChange.emit(true);
    this.status.set(`Uploading ${valid.length} photo${valid.length > 1 ? 's' : ''}…`);

    let images = this.images();
    for (const [index, file] of valid.entries()) {
      const upload = this.api.uploadImage({ fileToUpload: file });
      const result = upload ? await firstValueFrom(upload) : undefined;
      const all = (result as { all?: string[] } | undefined)?.all;
      const url = all?.[all.length - 1];
      if (!result || result.error || !url) {
        this.errors.update((list) => [...list, `${file.name}: upload failed. Try again.`]);
      } else if (!images.includes(url)) {
        images = [...images, url];
        this.imagesChange.emit(images);
        if (!this.mainImage()) this.mainImageChange.emit(url);
      }
      URL.revokeObjectURL(pending[index].preview);
      this.uploads.update((list) => list.filter((u) => u.id !== pending[index].id));
    }
    this.uploadingChange.emit(false);
    this.status.set(this.errors().length ? 'Some photos could not be uploaded.' : 'Photos uploaded.');
  }

  addUrl(): void {
    const url = this.imageUrl.trim();
    if (!/^https?:\/\/\S+$/.test(url)) {
      this.errors.set(['Enter a full image URL starting with https://']);
      return;
    }
    this.errors.set([]);
    if (!this.images().includes(url)) {
      this.imagesChange.emit([...this.images(), url]);
      if (!this.mainImage()) this.mainImageChange.emit(url);
    }
    this.imageUrl = '';
  }

  remove(image: string): void {
    const images = this.images().filter((i) => i !== image);
    this.imagesChange.emit(images);
    if (this.mainImage() === image) this.mainImageChange.emit(images[0] ?? '');
    this.status.set('Photo removed.');
  }

  setMain(image: string): void {
    this.mainImageChange.emit(image);
    this.status.set('Main photo changed.');
  }

  move(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.images().length) return;
    const images = [...this.images()];
    moveItemInArray(images, index, target);
    this.imagesChange.emit(images);
    this.status.set(`Photo moved to position ${target + 1}.`);
  }

  dropped(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const images = [...this.images()];
    moveItemInArray(images, event.previousIndex, event.currentIndex);
    this.imagesChange.emit(images);
  }
}
