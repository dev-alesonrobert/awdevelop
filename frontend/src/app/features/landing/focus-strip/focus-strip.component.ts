import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { LandingContent } from '../../../core/content-models';
@Component({ selector: 'aw-focus-strip', imports: [], templateUrl: './focus-strip.component.html', styleUrl: './focus-strip.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class FocusStripComponent {
    readonly content = input.required<LandingContent>();
    readonly contactAvailable = input(true);
}
