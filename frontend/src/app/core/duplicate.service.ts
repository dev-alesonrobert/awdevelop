import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom, timeout} from 'rxjs';
import {DuplicateLead} from './commercial-models';
export interface DuplicateIdentity { name?: string; company?: string; city?: string; email?: string; phone?: string; website?: string; }
@Injectable({providedIn:'root'})
export class DuplicateService {
 private readonly http=inject(HttpClient);
 check(identity:DuplicateIdentity,excludeId?:string) {
  return firstValueFrom(this.http.post<{items:DuplicateLead[]}>('/api/admin/crm/duplicates',{...identity,excludeId}).pipe(timeout(10000)));
 }
}
