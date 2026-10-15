import {ChangeDetectionStrategy,Component,input} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {CommercialInsights} from '../../../../core/insights.models';
import {stages} from '../../../../core/commercial-models';
@Component({selector:'aw-commercial-insights',imports:[CurrencyPipe],templateUrl:'./commercial-insights.component.html',styleUrl:'./commercial-insights.component.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class CommercialInsightsComponent {
 readonly data=input.required<CommercialInsights>();
 readonly stages=stages;
 stage(id:string){return this.data().stages.find(item=>item.stage===id)||{count:0,value:0};}
}
