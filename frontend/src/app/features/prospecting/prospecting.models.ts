export interface Location { name: string; lat: number; lon: number; }
export interface Prospect {
  placeId?: string; detailToken?: string; detailsLoaded?: boolean; attributions?: {name:string;url:string}[];
  key: string; name: string; segment: string; phone: string; email: string;
  website: string; instagram: string; city: string; state: string; neighborhood: string;
  address: string; sourceUrl: string; source: string; description: string;
}
export interface SearchResponse { searchId: string; provider?: 'google'; items: Prospect[]; cached: boolean; searchedAt: string; }
export interface SearchQuery { provider: 'osm' | 'web' | 'google'; category: string; location: Location; radius: number; keyword: string; }
export interface Config { categories: {id: string; label: string}[]; webEnabled: boolean; osmEnabled: boolean; googleEnabled: boolean; googleLimits?: {search:{daily:number;monthly:number};details:{daily:number;monthly:number}}; otherDailyLimit?: number; }
export interface ImportForm { name: string; phone: string; email: string; website: string; service: string; }
export interface CrmStatus { key: string; id: string; stage: import('../../core/models').Stage; }



