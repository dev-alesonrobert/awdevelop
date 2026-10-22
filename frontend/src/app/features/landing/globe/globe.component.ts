import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { LandingContent } from '../../../core/content-models';
import { ElementRef, viewChild, inject, NgZone } from '@angular/core';
import { createGlobe } from './globe-renderer';
@Component({ selector: 'aw-globe', imports: [], templateUrl: './globe.component.html', styleUrl: './globe.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class GlobeComponent {
    readonly content = input.required<LandingContent>();
    readonly contactAvailable = input(true);
    readonly paused = signal(false);
    readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
    private controls?: ReturnType<typeof createGlobe>;
    private readonly zone = inject(NgZone);
    ngAfterViewInit() { this.zone.runOutsideAngular(() => { this.controls = createGlobe(this.canvas().nativeElement, value => this.zone.run(() => this.paused.set(value))); }); }
    toggle() { this.controls?.toggle(); }
    ngOnDestroy() { this.controls?.destroy(); }
}
