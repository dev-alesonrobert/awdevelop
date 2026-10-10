import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { LandingContent } from '../../../core/content-models';
@Component({ selector: 'aw-about', imports: [], templateUrl: './about.component.html', styleUrl: './about.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class AboutComponent {
    readonly content = input.required<LandingContent>();
    readonly contactAvailable = input(true);
}
