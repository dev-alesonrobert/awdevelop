import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Config, ImportForm, Location, SearchQuery, SearchResponse } from './prospecting.models';

@Injectable({providedIn:'root'})
export class ProspectingService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/admin/prospecting';
  config() { return this.http.get<Config>(this.base + '/config'); }
  locations(q: string) { return this.http.get<{items: Location[]}>(this.base + '/locations', {params: {q}}); }
  search(query: SearchQuery) { return this.http.post<SearchResponse>(this.base + '/search', query); }
  save(searchId: string, key: string, form: ImportForm) { return this.http.post<{id:string;duplicate:boolean}>(this.base + '/import',{searchId,key,...form}); }
}
