import {ChangeDetectionStrategy, Component, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {DuplicateIdentity,DuplicateService} from '../../core/duplicate.service';
import {DuplicateLead} from '../../core/commercial-models';
@Component({selector:'aw-duplicate-review',imports:[FormsModule,DatePipe,RouterLink],templateUrl:'./duplicate-review.component.html',styleUrl:'./duplicate-review.component.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class DuplicateReviewComponent {
 readonly identity=input.required<DuplicateIdentity>();
 readonly excludeId=input<string>();
 readonly approved=output<void>();
 readonly busy=signal(false);
 readonly matches=signal<DuplicateLead[]>([]);
 readonly message=signal('');
 acknowledged=false;
 private signature='';
 private readonly service=inject(DuplicateService);
 async review(save=false) {
  if(this.busy())return;
  const fingerprint=JSON.stringify([this.identity(),this.excludeId()]);
  this.busy.set(true);this.message.set('');
  try {
   const result=await this.service.check(this.identity(),this.excludeId());
   if(fingerprint!==JSON.stringify([this.identity(),this.excludeId()])){this.acknowledged=false;this.message.set('Os dados mudaram. Verifique novamente antes de salvar.');return;}
   const signature=fingerprint+JSON.stringify(result.items.map(item=>item.id));
   if(signature!==this.signature)this.acknowledged=false;
   this.signature=signature;this.matches.set(result.items);
   if(save&&(!result.items.length||this.acknowledged))this.approved.emit();
   else if(!result.items.length)this.message.set('Nenhuma correspondência encontrada.');
  }catch {this.message.set('Não foi possível verificar duplicidades. Tente novamente antes de salvar.');}
  finally {this.busy.set(false);}
 }
}
