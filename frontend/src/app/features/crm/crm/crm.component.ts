import { Component, ChangeDetectionStrategy, inject, signal, input, output, DestroyRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { PipelineComponent } from '../pipeline/pipeline.component';
import { LeadEditorComponent } from '../lead-editor/lead-editor.component';
import { CrmPage } from '../crm-page';
@Component({ selector: 'aw-crm', imports: [FormsModule, PageHeadingComponent, PipelineComponent, LeadEditorComponent], providers: [CrmPage], templateUrl: './crm.component.html', styleUrl: './crm.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class CrmComponent {
    readonly page = inject(CrmPage);
    constructor() { void this.page.initialize(); }
    canLeave() { return this.page.canLeave(); }
}
