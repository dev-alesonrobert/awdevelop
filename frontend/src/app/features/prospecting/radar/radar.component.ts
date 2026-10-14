import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'aw-opportunity-radar',
  templateUrl: './radar.component.html',
  styleUrl: './radar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarComponent {
  readonly counts = input.required<{ total: number; high: number; pending: number; saved: number }>();
  readonly filter = input('');
  readonly filtered = output<string>();
}
