import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LandingSection, sectionLabel, SectionEdit } from '../../models';
@Component({
    selector: 'aw-section-card',
    imports: [FormsModule],
    templateUrl: './section-card.component.html',
    styleUrl: './section-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionCardComponent {
    readonly section = input.required<LandingSection>();
    readonly index = input.required<number>();
    readonly total = input.required<number>();
    readonly busy = input(false);
    readonly contentHref = input.required<string>();
    readonly move = output<number>();
    readonly remove = output<void>();
    readonly edit = output<SectionEdit>();
    readonly upload = output<Event>();
    readonly leave = output<Event>();
    readonly label = sectionLabel;
    editField(key: SectionEdit['key'], value: string) {
        this.edit.emit({
            key, value
        });
    }
}
