import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { LandingContent } from '../../../core/content-models';
@Component({ selector: 'aw-faq', imports: [], templateUrl: './faq.component.html', styleUrl: './faq.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class FaqComponent {
    readonly content = input.required<LandingContent>();
    readonly contactAvailable = input(true);
}
