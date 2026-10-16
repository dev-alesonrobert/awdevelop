import {Injectable,inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import type {MeetingStatus,MeetingSession} from './meetings.models';

@Injectable({providedIn:'root'})
export class MeetingsApi {
 private readonly http=inject(HttpClient);
 status(){return this.http.get<MeetingStatus>('/api/admin/meetings/status');}
 create(){return this.http.post<{room:string}>('/api/admin/meetings',{});}
 join(room:string){return this.http.post<MeetingSession>('/api/admin/meetings/token',{room});}
}
