export interface Location { name: string; lat: number; lon: number; }
export interface Prospect {
  key: string; name: string; segment: string; phone: string; email: string;
  website: string; instagram: string; city: string; state: string; neighborhood: string;
  address: string; sourceUrl: string; source: string; description: string;
}
export interface SearchResponse { searchId: string; items: Prospect[]; cached: boolean; searchedAt: string; }
export interface SearchQuery { provider: 'osm' | 'web'; category: string; location: Location; radius: number; keyword: string; }
export interface Config { categories: {id: string; label: string}[]; webEnabled: boolean; osmEnabled: boolean; }
export interface ImportForm { name: string; phone: string; email: string; website: string; service: string; }
