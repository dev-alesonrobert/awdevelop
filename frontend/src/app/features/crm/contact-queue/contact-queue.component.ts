import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DatePipe} from '@angular/common';
import {ContactQueue,ContactQueueItem} from '../../../core/commercial-models';
@Component({selector:'aw-contact-queue',imports:[FormsModule,DatePipe],templateUrl:'./contact-queue.component.html',styleUrl:'./contact-queue.component.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class ContactQueueComponent {
 readonly data=input.required<ContactQueue>();
 readonly busy=input(false);
 readonly opened=output<string>();
 readonly completed=output<ContactQueueItem>();
 bucket='';
 visible(){return this.data().items.filter(item=>!this.bucket||item.bucket===this.bucket);}
 readonly labels: Record<string,string>={overdue:'Retorno atrasado',today:'Retorno de hoje',first:'Primeiro contato'};
}
