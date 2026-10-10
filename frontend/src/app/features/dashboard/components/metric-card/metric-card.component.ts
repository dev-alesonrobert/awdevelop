import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
@Component({
    selector: 'aw-metric-card',
    imports: [],
    templateUrl: './metric-card.component.html',
    styleUrl: './metric-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricCardComponent {
    readonly label = input.required<string>();
    readonly value = input.required<string | number>();
}
