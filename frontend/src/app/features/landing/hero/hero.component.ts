import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { LandingContent } from '../../../core/content-models';
@Component({ selector: 'aw-hero', imports: [], templateUrl: './hero.component.html', styleUrl: './hero.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class HeroComponent {
    readonly content = input.required<LandingContent>();
    readonly contactAvailable = input(true);
}
