import { Component, ChangeDetectionStrategy, inject, signal, input, output, DestroyRef, effect } from '@angular/core';
import { AdminPage } from '../../../core/admin-page';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { MediaPickerComponent } from '../../../shared/media-picker/media-picker.component';
@Component({ selector: 'aw-media', imports: [PageHeadingComponent, MediaPickerComponent], templateUrl: './media.component.html', styleUrl: './media.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class MediaComponent extends AdminPage {
    readonly selected = signal('');
    async copy() { try {
        await navigator.clipboard.writeText(this.selected());
        this.message.set('URL copiada.');
    }
    catch {
        this.message.set('Selecione a URL e copie manualmente.');
    } }
}
