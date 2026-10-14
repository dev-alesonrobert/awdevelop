import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageHeadingComponent } from '../../shared/page-heading/page-heading.component';
import { RadarComponent } from './radar/radar.component';
import { PipelineComponent } from '../crm/pipeline/pipeline.component';
import { ApproachComponent } from './approach/approach.component';
import { ProspectingPage } from './prospecting-page';
@Component({ selector: 'aw-prospecting', imports: [FormsModule, DatePipe, RouterLink, PageHeadingComponent, RadarComponent, PipelineComponent, ApproachComponent], providers: [ProspectingPage], templateUrl: './prospecting.component.html', styleUrl: './prospecting.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class ProspectingComponent {
    readonly page = inject(ProspectingPage);
    constructor() { void this.page.initialize(); }
    canLeave() { return this.page.canLeave(); }
}
