import { Component, ChangeDetectionStrategy, inject, signal, input, output, DestroyRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Quote, QuoteStatus, quoteStatuses, whatsapp } from '../../../core/commercial-models';
import { ProposalComponent } from '../proposal/proposal.component';
@Component({ selector: 'aw-quote-detail', imports: [FormsModule, DatePipe, RouterLink, ProposalComponent], templateUrl: './quote-detail.component.html', styleUrl: './quote-detail.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class QuoteDetailComponent {
    readonly quote = input.required<Quote>();
    readonly busy = input(false);
    readonly save = output<{
        status: QuoteStatus;
        notes: string;
    }>();
    readonly changed = output<void>();
    readonly proposalPending = output<boolean>();
    readonly proposalWorking = output<boolean>();
    readonly statuses = quoteStatuses;
    readonly wa = whatsapp;
    status: QuoteStatus = 'new';
    notes = '';
    private quoteId = '';
    constructor() { effect(() => { const quote = this.quote(); if (quote.id === this.quoteId) return; this.quoteId = quote.id; this.status = quote.status; this.notes = quote.notes; }); }
}
