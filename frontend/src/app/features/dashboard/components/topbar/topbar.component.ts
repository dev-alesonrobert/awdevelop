import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
@Component({
    selector: 'aw-topbar',
    imports: [NotificationBellComponent],
    templateUrl: './topbar.component.html',
    styleUrl: './topbar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
    readonly commercial = input(false);
    readonly name = input<string>();
    readonly busy = input(false);
    readonly logout = output<void>();
}
