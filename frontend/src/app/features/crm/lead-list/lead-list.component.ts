import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { LeadCard, stages } from '../../../core/commercial-models';

@Component({
  selector: 'aw-lead-list', imports: [CurrencyPipe],
  templateUrl: './lead-list.component.html', styleUrl: './lead-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LeadListComponent {
  readonly leads = input<LeadCard[]>([]);
  readonly opened = output<string>();
  label(stage: string) { return stages.find(item => item.id === stage)?.label ?? stage; }
}
