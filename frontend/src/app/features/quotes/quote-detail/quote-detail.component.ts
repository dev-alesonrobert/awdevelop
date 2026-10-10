import { Component, ChangeDetectionStrategy, inject, signal, input, output, DestroyRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Quote, QuoteStatus, quoteStatuses, whatsapp } from '../../../core/commercial-models';
@Component({ selector: 'aw-quote-detail', imports: [FormsModule, DatePipe, RouterLink], templateUrl: './quote-detail.component.html', styleUrl: './quote-detail.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class QuoteDetailComponent {
    readonly quote = input.required<Quote>();
    readonly busy = input(false);
    readonly save = output<{
        status: QuoteStatus;
        notes: string;
    }>();
    readonly changed = output<void>();
    readonly statuses = quoteStatuses;
    readonly wa = whatsapp;
    status: QuoteStatus = 'new';
    notes = '';
    constructor() { effect(() => { this.status = this.quote().status; this.notes = this.quote().notes; }); }
}
