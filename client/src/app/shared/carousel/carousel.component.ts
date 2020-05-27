import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { BehaviorSubject, of, Subscription, timer } from 'rxjs';
import { delay, take } from 'rxjs/operators';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
})
export class CarouselComponent implements AfterViewInit, OnDestroy {
  @ViewChild('slides') slides: ElementRef<HTMLDivElement>;
  @ViewChild('slideContainer') slideContainer: ElementRef<HTMLDivElement>;

  showArrowsSub$ = new BehaviorSubject(false);
  autoSlideSub: Subscription;

  ngAfterViewInit(): void {
    of('slidesChildren')
      .pipe(delay(300), take(1))
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

    this.autoSlideSub = timer(10000, 8000).subscribe(() => { this.onClickRight(); })
  }

  ngOnDestroy(): void {
    if (this.autoSlideSub) {
      this.autoSlideSub.unsubscribe();
    }
  }

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
}
