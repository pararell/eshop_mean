import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';

import { IconComponent } from '../icon/icon.component';
import { ImagesDialogComponent } from '../images-dialog/images-dialog.component';

/** Product images: main image with arrows, thumbnails, keyboard and swipe; click opens the full-screen lightbox */
@Component({
  selector: 'app-product-gallery',
  templateUrl: './product-gallery.component.html',
  styleUrls: ['./product-gallery.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NgOptimizedImage],
})
export class ProductGalleryComponent {
  private dialog = inject(MatDialog);

  readonly images = input.required<string[]>();
  /** Product title, used for the image alt texts */
  readonly alt = input('');

  readonly index = signal(0);
  readonly current = computed(() => this.images()[this.index()] ?? '');
  readonly hasMany = computed(() => this.images().length > 1);
  private pointerStartX: number | null = null;
  private swiped = false;

  constructor() {
    // A different product (or language) starts at its main image
    effect(() => {
      this.images();
      this.index.set(0);
    });
  }

  select(index: number): void {
    const count = this.images().length;
    if (!count) return;
    this.index.set((index + count) % count);
  }

  prev(): void {
    this.select(this.index() - 1);
  }

  next(): void {
    this.select(this.index() + 1);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') this.prev();
    else if (event.key === 'ArrowRight') this.next();
    else return;
    event.preventDefault();
  }

  onPointerDown(event: PointerEvent): void {
    this.pointerStartX = event.clientX;
  }

  /** A horizontal swipe of 40px or more changes the image instead of opening the lightbox */
  onPointerUp(event: PointerEvent): void {
    if (this.pointerStartX === null) return;
    const distance = event.clientX - this.pointerStartX;
    this.pointerStartX = null;
    if (Math.abs(distance) < 40 || !this.hasMany()) return;
    this.swiped = true;
    if (distance < 0) this.next();
    else this.prev();
  }

  onMainClick(): void {
    if (this.swiped) {
      this.swiped = false;
      return;
    }
    this.openLightbox();
  }

  openLightbox(): void {
    this.dialog
      .open(ImagesDialogComponent, {
        data: { index: this.index(), images: this.images(), alt: this.alt() },
        panelClass: 'lightbox-panel',
        backdropClass: 'lightbox-backdrop',
        width: '100vw',
        height: '100dvh',
        maxWidth: '100vw',
        maxHeight: '100dvh',
        autoFocus: 'dialog',
      })
      .afterClosed()
      .subscribe((index?: number) => {
        if (typeof index === 'number') this.select(index);
      });
  }
}
