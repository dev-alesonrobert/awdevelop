import { Component, ChangeDetectionStrategy, ElementRef, input, signal, viewChild } from '@angular/core';
import { LandingContent } from '../../../core/content-models';

@Component({
    selector: 'aw-globe',
    imports: [],
    templateUrl: './globe.component.html',
    styleUrl: './globe.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobeComponent {
    readonly content = input.required<LandingContent>();
    readonly contactAvailable = input(true);
    readonly paused = signal(false);
    readonly motion = viewChild.required<ElementRef<HTMLIFrameElement>>('motion');

    toggle(): void {
        this.paused.update(value => !value);
        this.motion().nativeElement.contentWindow?.postMessage(
            { type: 'aw-motion-pause', paused: this.paused() },
            '*',
        );
    }
}
