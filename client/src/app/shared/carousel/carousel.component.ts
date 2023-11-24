import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, PLATFORM_ID, Inject, Input, signal } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { take } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  standalone: true,
  imports: [MatButtonModule]

})
export class CarouselComponent implements AfterViewInit, OnDestroy {
  @ViewChild('slides') slides: ElementRef<HTMLDivElement>;
  @ViewChild('slideContainer') slideContainer: ElementRef<HTMLDivElement>;

  @Input() intervalForSlider = 10000;
  @Input() withBackground = false;
  @Input() absoluteArrows = false;
  @Input() showArrows = true;

  showArrowsSig = signal(false);
  autoSlideSub: Subscription;
  dragging = false;

  constructor(
    @Inject(PLATFORM_ID)
    private platformId : Object) { }

  onClickLeft() {
    const slidesElement = this.slides.nativeElement;
    const slidesElementWIDTH = slidesElement.getBoundingClientRect().width;
    slidesElement.scrollLeft -= slidesElementWIDTH;
    if (!slidesElement.scrollLeft) {
      slidesElement.scrollLeft += slidesElementWIDTH * slidesElement.children.length - 1;
    }
  }

  onClickRight() {
    const slidesElement = this.slides.nativeElement;
    const slidesElementWIDTH = slidesElement.getBoundingClientRect().width;
    slidesElement.scrollLeft += slidesElementWIDTH;
    if ((parseFloat((slidesElement.scrollWidth - slidesElement.scrollLeft).toFixed()) <= parseFloat(slidesElementWIDTH.toFixed()))) {
      slidesElement.scrollLeft = 0;
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      timer(0, 300)
        .pipe(take(1))
        .subscribe(() => {
          const slidesElement = this.slides.nativeElement;
          if (slidesElement.children && slidesElement.children[0]) {
            this.showArrowsSig.set(
              slidesElement.offsetWidth < slidesElement.children[0].clientWidth * slidesElement.children.length
            );
          } else {
            this.showArrowsSig.set(true);
          }
      });
      this.autoSlideSub = timer(this.intervalForSlider, this.intervalForSlider).subscribe(() => { this.onClickRight(); })
    }
  }

  onDrag(e, type: string) {
    this.dragging = type === 'down' ? true : (type === 'up' ? false : this.dragging);
    if (this.dragging && type === 'move') {
      const slidesElement = this.slides.nativeElement;
      slidesElement.scrollLeft += e.movementX * -50;
    }
  }

  ngOnDestroy(): void {
    if (this.autoSlideSub) {
      this.autoSlideSub.unsubscribe();
    }
  }
}
