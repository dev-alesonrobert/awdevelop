import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
@Component({
    selector: 'aw-page-heading',
    imports: [],
    templateUrl: './page-heading.component.html',
    styleUrl: './page-heading.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeadingComponent {
    readonly eyebrow = input.required<string>();
    readonly title = input.required<string>();
    readonly description = input.required<string>();
}
