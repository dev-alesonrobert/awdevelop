import {ChangeDetectionStrategy,Component,input} from '@angular/core';
import {DatePipe} from '@angular/common';
import {UsageBudget} from '../../../../core/insights.models';
@Component({selector:'aw-integration-usage',imports:[DatePipe],templateUrl:'./integration-usage.component.html',styleUrl:'./integration-usage.component.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class IntegrationUsageComponent {
 readonly budgets=input.required<UsageBudget[]>();
 readonly updatedAt=input.required<string>();
}
