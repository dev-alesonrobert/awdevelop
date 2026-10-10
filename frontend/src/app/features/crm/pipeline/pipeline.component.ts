import { Component, ChangeDetectionStrategy, inject, signal, input, output, DestroyRef, effect } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Stage } from '../../../core/models';
import { Board, stages } from '../../../core/commercial-models';
import { LeadCardComponent } from '../lead-card/lead-card.component';
@Component({ selector: 'aw-pipeline', imports: [CurrencyPipe, LeadCardComponent], templateUrl: './pipeline.component.html', styleUrl: './pipeline.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class PipelineComponent {
    readonly board = input.required<Board>();
    readonly opened = output<string>();
    readonly stages = stages;
    cards(id: Stage) { return this.board().items.filter(x => x.crm_stage === id); }
    stat(id: Stage) { return this.board().stats.find(x => x.crm_stage === id); }
}
