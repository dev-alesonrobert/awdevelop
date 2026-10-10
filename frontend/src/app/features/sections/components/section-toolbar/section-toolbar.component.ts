import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
@Component({
    selector: 'aw-section-toolbar',
    imports: [],
    templateUrl: './section-toolbar.component.html',
    styleUrl: './section-toolbar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionToolbarComponent {
    readonly busy = input(false);
    readonly dirty = input(false);
    readonly loaded = input(false);
    readonly canPublish = input(false);
    readonly hasUnpublished = input(false);
    readonly canUndo = input(false);
    readonly save = output<void>();
    readonly publish = output<void>();
    readonly undo = output<void>();
    readonly reload = output<void>();
    readonly preview = output<Event>();
}
