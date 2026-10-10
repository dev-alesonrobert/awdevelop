import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { LandingContent } from '../../../core/content-models';
@Component({ selector: 'aw-services', imports: [], templateUrl: './services.component.html', styleUrl: './services.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class ServicesComponent {
    readonly content = input.required<LandingContent>();
    readonly contactAvailable = input(true);
}
