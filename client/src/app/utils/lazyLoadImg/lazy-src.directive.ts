// Import the core angular services.
import { Directive } from '@angular/core';
import { ElementRef } from '@angular/core';
import { OnDestroy } from '@angular/core';
import { OnInit, Input } from '@angular/core';
import { Renderer2 } from '@angular/core';

// Import the application components and services.
import { LazyTarget } from './lazy-viewport';
import { LazyViewport } from './lazy-viewport';

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //
@Directive({
    selector: '[lazySrc]'
})
export class LazySrcDirective implements OnInit, OnDestroy, LazyTarget {

    @Input('lazySrc') src: string;
    @Input('lazyBackground') backgroundUrl: string;
    @Input('lazySrcVisible') visibleClass: string;

    public element: Element;

    private lazyViewport: LazyViewport;
    private renderer: Renderer2;

    // I initialize the lazy-src directive.
    constructor(
        elementRef: ElementRef,
        lazyViewport: LazyViewport,
        renderer: Renderer2
        ) {

        this.element = elementRef.nativeElement;
        this.lazyViewport = lazyViewport;
        this.renderer = renderer;

        this.src = '';
        this.backgroundUrl = '';
        this.visibleClass = '';

    }

    // ---
    // PUBLIC METHODS.
    // ---
    // I get called once when the directive is being destroyed.
    public ngOnDestroy(): void {

        // If we haven't detached from the LazyViewport, do so now.
        ( this.lazyViewport ) && this.lazyViewport.removeTarget( this );

    }



    // I get called once after the inputs have been bound for the first time.
    public ngOnInit(): void {

        // Attached this directive the LazyViewport so that we can be alerted to changes
        // in this element's visibility on the page.
        this.lazyViewport.addTarget( this );

    }


    // I get called by the LazyViewport service when the element associated with this
    // directive has its visibility changed.
    public updateVisibility( isVisible: boolean, ratio: number ): void {

        // When this target starts being tracked by the viewport, the initial visibility
        // will be reported, even if it is not visible. As such, let's ignore the first
        // visibility update.
        if ( ! isVisible ) {

            return;

        }

        // Now that the element is visible, load the underlying SRC value. And, since we
        // no longer need to worry about loading, we can detach from the LazyViewport.
        this.lazyViewport.removeTarget( this );
        this.lazyViewport = null;
        if (this.src) {
          this.renderer.setProperty( this.element, 'src', this.src );
        }
        if (this.backgroundUrl) {
          this.renderer.setStyle(this.element, 'background', this.backgroundUrl);
        }

        // If an active class has been provided, add it to the element.
        ( this.visibleClass ) && this.renderer.addClass( this.element, this.visibleClass );

    }

}
