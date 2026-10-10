import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { LandingContent } from '../../../core/content-models';
@Component({ selector: 'aw-invitation', imports: [], templateUrl: './invitation.component.html', styleUrl: './invitation.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class InvitationComponent {
    readonly content = input.required<LandingContent>();
    readonly contactAvailable = input(true);
}
