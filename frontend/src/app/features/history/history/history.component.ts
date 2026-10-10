import { Component, ChangeDetectionStrategy, inject, signal, input, output, DestroyRef, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { HistoryPage } from '../history-page';
@Component({ selector: 'aw-history', imports: [DatePipe, PageHeadingComponent], providers: [HistoryPage], templateUrl: './history.component.html', styleUrl: './history.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class HistoryComponent {
    readonly page = inject(HistoryPage);
    constructor() { void this.page.load(); }
    canLeave() { return this.page.canLeave(); }
}
