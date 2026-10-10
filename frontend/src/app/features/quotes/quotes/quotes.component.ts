import { Component, ChangeDetectionStrategy, inject, signal, input, output, DestroyRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { QuoteDetailComponent } from '../quote-detail/quote-detail.component';
import { quoteStatuses } from '../../../core/commercial-models';
import { QuotesPage } from '../quotes-page';
@Component({ selector: 'aw-quotes', imports: [FormsModule, PageHeadingComponent, QuoteDetailComponent], providers: [QuotesPage], templateUrl: './quotes.component.html', styleUrl: './quotes.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class QuotesComponent {
    readonly page = inject(QuotesPage);
    readonly statuses = quoteStatuses;
    constructor() { void this.page.load(); }
    canLeave() { return this.page.canLeave(); }
}
