import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { IconComponent } from '../icon/icon.component';

export interface ImagesDialogData {
  index: number;
  images: string[];
  alt?: string;
}

const CLICK_ZOOM = 2.5;
const MAX_ZOOM = 5;
/** Pointer movement below this (px) is a click, not a drag */
const CLICK_SLOP = 6;

interface Point {
  x: number;
  y: number;
}

/**
 * Full-screen image viewer; closes with the current index so the gallery can follow.
 * Zoom: click or tap zooms into that point (again to zoom out), drag pans, wheel and pinch zoom.
 * The photo never leaves the screen: panning is clamped to its edges.
 */
@Component({
  selector: 'app-images-dialog',
  templateUrl: './images-dialog.component.html',
  styleUrls: ['./images-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {
    '(keydown.arrowleft)': 'prev()',
    '(keydown.arrowright)': 'next()',
    '(window:resize)': 'reset()',
  },
})
export class ImagesDialogComponent {
  private dialogRef = inject<MatDialogRef<ImagesDialogComponent, number>>(MatDialogRef);
  readonly data = inject<ImagesDialogData>(MAT_DIALOG_DATA);

  readonly index = signal(this.data.index);
  readonly current = computed(() => this.data.images[this.index()]);
  readonly count = this.data.images.length;

  readonly scale = signal(1);
  private readonly offset = signal<Point>({ x: 0, y: 0 });
  readonly zoomed = computed(() => this.scale() > 1.01);
  /** Off while the pointer moves the image (it must follow without lag) */
  readonly animate = signal(true);
  readonly transform = computed(() => `translate(${this.offset().x}px, ${this.offset().y}px) scale(${this.scale()})`);

  private viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private image = viewChild.required<ElementRef<HTMLImageElement>>('image');

  private pointers = new Map<number, Point>();
  private dragStart?: { pointer: Point; offset: Point; moved: boolean };
  private pinchStart?: { distance: number; scale: number };

  prev(): void {
    this.go(this.index() - 1);
  }

  next(): void {
    this.go(this.index() + 1);
  }

  close(): void {
    this.dialogRef.close(this.index());
  }

  reset(): void {
    this.animate.set(true);
    this.scale.set(1);
    this.offset.set({ x: 0, y: 0 });
  }

  onPointerDown(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 2) {
      this.pinchStart = { distance: this.pinchDistance(), scale: this.scale() };
      this.dragStart = undefined;
    } else if (this.pointers.size === 1) {
      this.dragStart = { pointer: { x: event.clientX, y: event.clientY }, offset: this.offset(), moved: false };
    }
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pinchStart && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.animate.set(false);
      this.zoomAt(this.pinchStart.scale * (this.pinchDistance() / this.pinchStart.distance), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      return;
    }

    const drag = this.dragStart;
    if (!drag) return;
    const dx = event.clientX - drag.pointer.x;
    const dy = event.clientY - drag.pointer.y;
    if (!drag.moved && Math.hypot(dx, dy) < CLICK_SLOP) return;
    drag.moved = true;
    if (this.zoomed()) {
      this.animate.set(false);
      this.offset.set(this.clamp({ x: drag.offset.x + dx, y: drag.offset.y + dy }, this.scale()));
    }
  }

  onPointerUp(event: PointerEvent): void {
    const drag = this.dragStart;
    this.pointers.delete(event.pointerId);
    this.animate.set(true);
    if (this.pointers.size < 2) this.pinchStart = undefined;
    if (this.pointers.size === 0) {
      this.dragStart = undefined;
      // A click (or tap) toggles the zoom at that point
      if (drag && !drag.moved && event.type === 'pointerup') {
        if (this.zoomed()) this.reset();
        else this.zoomAt(CLICK_ZOOM, { x: event.clientX, y: event.clientY });
      }
    } else if (this.pointers.size === 1) {
      // One finger left after a pinch: continue as a drag from here
      const [rest] = [...this.pointers.values()];
      this.dragStart = { pointer: rest, offset: this.offset(), moved: true };
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.animate.set(false);
    this.zoomAt(this.scale() * Math.exp(-event.deltaY * 0.002), { x: event.clientX, y: event.clientY });
  }

  /** Zooms to `scale`, keeping the image point under `client` (viewport coordinates) in place */
  private zoomAt(scale: number, client: Point): void {
    const next = Math.min(MAX_ZOOM, Math.max(1, scale));
    const rect = this.viewport().nativeElement.getBoundingClientRect();
    // Transform origin is the viewport centre
    const c = { x: client.x - rect.left - rect.width / 2, y: client.y - rect.top - rect.height / 2 };
    const ratio = next / this.scale();
    const offset = { x: c.x - (c.x - this.offset().x) * ratio, y: c.y - (c.y - this.offset().y) * ratio };
    this.scale.set(next);
    this.offset.set(this.clamp(offset, next));
  }

  /** Keeps the photo's edges on screen; a side smaller than the viewport stays centred */
  private clamp(offset: Point, scale: number): Point {
    const box = this.viewport().nativeElement.getBoundingClientRect();
    const img = this.image().nativeElement;
    const fit = img.naturalWidth && img.naturalHeight ? Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight) : 1;
    const width = (img.naturalWidth ? img.naturalWidth * fit : box.width) * scale;
    const height = (img.naturalHeight ? img.naturalHeight * fit : box.height) * scale;
    const maxX = Math.max(0, (width - box.width) / 2);
    const maxY = Math.max(0, (height - box.height) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, offset.x)), y: Math.min(maxY, Math.max(-maxY, offset.y)) };
  }

  private pinchDistance(): number {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }

  private go(index: number): void {
    this.reset();
    this.index.set((index + this.count) % this.count);
  }
}
