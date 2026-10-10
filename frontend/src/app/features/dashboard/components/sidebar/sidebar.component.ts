import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Role } from '../../../../core/models';
import { BrandComponent } from '../../../../shared/brand/brand.component';
@Component({
    selector: 'aw-sidebar',
    imports: [BrandComponent, RouterLink, RouterLinkActive],
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
    readonly role = input<Role | undefined>();
}
