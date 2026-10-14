import {
  Component,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  PLATFORM_ID,
  signal,
  ChangeDetectionStrategy,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { take } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatButtonModule],
})
export class CarouselComponent implements AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);

  readonly slides = viewChild.required<ElementRef<HTMLDivElement>>('slides');
  readonly slideContainer = viewChild.required<ElementRef<HTMLDivElement>>('slideContainer');

  readonly intervalForSlider = input(10000);
  readonly withBackground = input(false);
  readonly absoluteArrows = input(false);
  readonly showArrows = input(true);

  showArrowsSig = signal(false);
  autoSlideSub!: Subscription;
  dragging = false;

  onClickLeft() {
    const slidesElement = this.slides().nativeElement;
    const slidesElementWIDTH = slidesElement.getBoundingClientRect().width;
    slidesElement.scrollLeft -= slidesElementWIDTH;
    if (!slidesElement.scrollLeft) {
      slidesElement.scrollLeft += slidesElementWIDTH * slidesElement.children.length - 1;
    }
  }

  onClickRight() {
    const slidesElement = this.slides().nativeElement;
    const slidesElementWIDTH = slidesElement.getBoundingClientRect().width;
    slidesElement.scrollLeft += slidesElementWIDTH;
    if (parseFloat((slidesElement.scrollWidth - slidesElement.scrollLeft).toFixed()) <= parseFloat(slidesElementWIDTH.toFixed())) {
      slidesElement.scrollLeft = 0;
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      timer(0, 300)
        .pipe(take(1))
        .subscribe(() => {
          const slidesElement = this.slides().nativeElement;
          if (slidesElement.children && slidesElement.children[0]) {
            this.showArrowsSig.set(slidesElement.offsetWidth < slidesElement.children[0].clientWidth * slidesElement.children.length);
          } else {
            this.showArrowsSig.set(true);
          }
        });
      this.autoSlideSub = timer(this.intervalForSlider(), this.intervalForSlider()).subscribe(() => {
        this.onClickRight();
      });
    }
  }

  /** Also bound to touch events, which have no movementX (pre-existing; see audit UI-11) */
  onDrag(e: Event, type: string) {
    this.dragging = type === 'down' ? true : type === 'up' ? false : this.dragging;
    if (this.dragging && type === 'move') {
      const slidesElement = this.slides().nativeElement;
      slidesElement.scrollLeft += (e as MouseEvent).movementX * -50;
    }
  }

  ngOnDestroy(): void {
    if (this.autoSlideSub) {
      this.autoSlideSub.unsubscribe();
    }
  }
}
