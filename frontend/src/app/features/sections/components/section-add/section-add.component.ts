import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
@Component({
    selector: 'aw-section-add',
    imports: [FormsModule],
    templateUrl: './section-add.component.html',
    styleUrl: './section-add.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionAddComponent {
    readonly available = input.required<readonly {
        id: string;
        label: string;
    }[]>();
    readonly addType = input.required<string>();
    readonly count = input.required<number>();
    readonly busy = input(false);
    readonly addTypeChange = output<string>();
    readonly add = output<void>();
    readonly leave = output<Event>();
}
