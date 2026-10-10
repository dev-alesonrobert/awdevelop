import { Component, ChangeDetectionStrategy, inject, signal, input, output, DestroyRef, effect } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { LeadCard } from '../../../core/commercial-models';
@Component({ selector: 'aw-lead-card', imports: [CurrencyPipe], templateUrl: './lead-card.component.html', styleUrl: './lead-card.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class LeadCardComponent {
    readonly lead = input.required<LeadCard>();
    readonly opened = output<string>();
}
