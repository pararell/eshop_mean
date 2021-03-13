import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, PLATFORM_ID, Inject, Input } from '@angular/core';
import { BehaviorSubject, Subscription, timer } from 'rxjs';
import { take, filter } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
})
export class CarouselComponent implements AfterViewInit, OnDestroy {
  @ViewChild('slides') slides: ElementRef<HTMLDivElement>;
  @ViewChild('slideContainer') slideContainer: ElementRef<HTMLDivElement>;

  @Input() intervalForSlider = 10000;
  @Input() withBackground = false;
  @Input() absoluteArrows = false;

  showArrowsSub$ = new BehaviorSubject(false);
  autoSlideSub: Subscription;

  constructor(
    @Inject(PLATFORM_ID)
    private platformId : Object) { }

  onClickLeft() {
    const slidesElement = this.slides.nativeElement;
    slidesElement.scrollLeft -= slidesElement.offsetWidth;
    if (!slidesElement.scrollLeft) {
      slidesElement.scrollLeft += slidesElement.offsetWidth * slidesElement.children.length - 1;
    }
  }

  onClickRight() {
    const slidesElement = this.slides.nativeElement;
    slidesElement.scrollLeft += slidesElement.offsetWidth;
    if ((slidesElement.scrollWidth - slidesElement.scrollLeft).toFixed() === slidesElement.offsetWidth.toFixed()) {
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
            this.showArrowsSub$.next(
              slidesElement.offsetWidth < slidesElement.children[0].clientWidth * slidesElement.children.length
            );
          } else {
            this.showArrowsSub$.next(true);
          }
      });
      this.autoSlideSub = timer(this.intervalForSlider, this.intervalForSlider).subscribe(() => { this.onClickRight(); })
    }
  }

  ngOnDestroy(): void {
    if (this.autoSlideSub) {
      this.autoSlideSub.unsubscribe();
    }
  }
}
