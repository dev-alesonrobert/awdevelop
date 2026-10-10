import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { LandingContent } from '../../../core/content-models';
@Component({ selector: 'aw-process', imports: [], templateUrl: './process.component.html', styleUrl: './process.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class ProcessComponent {
    readonly content = input.required<LandingContent>();
    readonly contactAvailable = input(true);
}
