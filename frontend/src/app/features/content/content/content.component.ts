import { Component, ChangeDetectionStrategy, inject, signal, input, output, DestroyRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { MediaPickerComponent } from '../../../shared/media-picker/media-picker.component';
import { ActivatedRoute } from '@angular/router';
import { ContentEditor } from '../content-editor';
@Component({ selector: 'aw-content', imports: [FormsModule, PageHeadingComponent, MediaPickerComponent], providers: [ContentEditor], templateUrl: './content.component.html', styleUrl: './content.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class ContentComponent {
    readonly page = inject(ContentEditor);
    readonly groups = ['Apresentação', 'Portfólio', 'Contato', 'Identidade', 'Textos das seções'];
    readonly tab = signal(0);
    constructor() { const tab = inject(ActivatedRoute).snapshot.queryParamMap.get('tab'); this.tab.set(({ home: 0, portfolio: 1, contact: 2, settings: 3 } as Record<string, number>)[tab ?? 'home'] ?? 0); void this.page.load(); }
    canLeave() { return this.page.canLeave(); }
    set(group: 'hero' | 'contact' | 'settings', key: string, value: string | number | boolean) { this.page.edit(group, key, value); }
    keys() { return Object.keys(this.page.content()?.blocks ?? {}); }
}
