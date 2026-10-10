import { Component, ChangeDetectionStrategy, inject, signal, input, output, DestroyRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { MembersPage } from '../members-page';
@Component({ selector: 'aw-members', imports: [FormsModule, PageHeadingComponent], providers: [MembersPage], templateUrl: './members.component.html', styleUrl: './members.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class MembersComponent {
    readonly page = inject(MembersPage);
    constructor() { void this.page.load(); }
    canLeave() { return this.page.canLeave(); }
}
