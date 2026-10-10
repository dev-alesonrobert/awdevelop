import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
@Component({
    selector: 'aw-notification-card',
    imports: [DatePipe],
    templateUrl: './notification-card.component.html',
    styleUrl: './notification-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationCardComponent {
    readonly eyebrow = input.required<string>();
    readonly title = input.required<string>();
    readonly description = input.required<string>();
    readonly date = input.required<string>();
    readonly href = input.required<string>();
    readonly linkLabel = input.required<string>();
}
