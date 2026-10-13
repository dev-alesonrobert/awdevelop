import { z } from 'zod';
import { createHash, createHmac } from 'node:crypto';

export const categories = [
  {id:'restaurant',label:'Restaurantes',key:'amenity',value:'restaurant'},
  {id:'barber',label:'Barbearias e cabeleireiros',key:'shop',value:'hairdresser'},
  {id:'beauty',label:'Salões de beleza',key:'shop',value:'beauty'},
  {id:'aesthetic',label:'Clínicas de estética',key:'beauty',value:'aesthetic'},
  {id:'cafe',label:'Cafeterias',key:'amenity',value:'cafe'},
  {id:'bar',label:'Bares',key:'amenity',value:'bar'},
  {id:'hardware',label:'Materiais de construção',key:'shop',value:'doityourself|hardware'},
  {id:'market',label:'Mercados',key:'shop',value:'supermarket|convenience'},
  {id:'pharmacy',label:'Farmácias',key:'amenity',value:'pharmacy'},
  {id:'clothes',label:'Lojas de roupas',key:'shop',value:'clothes'},
  {id:'pet',label:'Pet shops',key:'shop',value:'pet'},
  {id:'auto',label:'Oficinas',key:'shop',value:'car_repair'},
  {id:'gym',label:'Academias',key:'leisure',value:'fitness_centre'},
  {id:'dentist',label:'Dentistas',key:'amenity',value:'dentist'},
  {id:'hotel',label:'Hotéis',key:'tourism',value:'hotel'},
  {id:'bakery',label:'Padarias',key:'shop',value:'bakery'},
  {id:'pastry',label:'Confeitarias',key:'shop',value:'pastry'},
  {id:'butcher',label:'Açougues',key:'shop',value:'butcher'},
  {id:'greengrocer',label:'Hortifrutis',key:'shop',value:'greengrocer'},
  {id:'icecream',label:'Sorveterias',key:'amenity',value:'ice_cream'},
  {id:'fastfood',label:'Lanchonetes',key:'amenity',value:'fast_food'},
  {id:'shoes',label:'Lojas de calçados',key:'shop',value:'shoes'},
  {id:'optician',label:'Óticas',key:'shop',value:'optician'},
  {id:'florist',label:'Floriculturas',key:'shop',value:'florist'},
  {id:'furniture',label:'Lojas de móveis',key:'shop',value:'furniture'},
  {id:'electronics',label:'Lojas de eletrônicos',key:'shop',value:'electronics'},
  {id:'mobile',label:'Lojas de celulares e acessórios',key:'shop',value:'mobile_phone'},
  {id:'computer',label:'Lojas de informática',key:'shop',value:'computer'},
  {id:'stationery',label:'Papelarias',key:'shop',value:'stationery'},
  {id:'books',label:'Livrarias',key:'shop',value:'books'},
  {id:'toys',label:'Lojas de brinquedos',key:'shop',value:'toys'},
  {id:'gifts',label:'Lojas de presentes',key:'shop',value:'gift'},
  {id:'jewelry',label:'Joalherias',key:'shop',value:'jewelry'},
  {id:'cosmetics',label:'Lojas de cosméticos',key:'shop',value:'cosmetics'},
  {id:'sports',label:'Lojas de artigos esportivos',key:'shop',value:'sports'},
  {id:'bicycle',label:'Bicicletarias',key:'shop',value:'bicycle'},
  {id:'carparts',label:'Autopeças',key:'shop',value:'car_parts'},
  {id:'carwash',label:'Lava-rápidos',key:'amenity',value:'car_wash'},
  {id:'laundry',label:'Lavanderias',key:'shop',value:'laundry'},
  {id:'tailor',label:'Alfaiatarias e ajustes de roupas',key:'shop',value:'tailor'},
  {id:'veterinary',label:'Clínicas veterinárias',key:'amenity',value:'veterinary'},
  {id:'clinic',label:'Clínicas médicas',key:'amenity',value:'clinic'},
  {id:'doctors',label:'Consultórios médicos',key:'amenity',value:'doctors'},
  {id:'school',label:'Escolas',key:'amenity',value:'school'},
  {id:'childcare',label:'Creches e educação infantil',key:'amenity',value:'kindergarten'},
  {id:'estate',label:'Imobiliárias',key:'office',value:'estate_agent'},
  {id:'accountant',label:'Escritórios de contabilidade',key:'office',value:'accountant'},
  {id:'lawyer',label:'Escritórios de advocacia',key:'office',value:'lawyer'},
  {id:'architect',label:'Escritórios de arquitetura',key:'office',value:'architect'},
  {id:'travel',label:'Agências de viagens',key:'shop',value:'travel_agency'}
].sort((a,b)=>a.label.localeCompare(b.label,'pt-BR'));
export const searchSchema = z.object({
  provider:z.enum(['osm','web','google']), category:z.enum(categories.map(x=>x.id)),
  location:z.object({name:z.string().trim().min(2).max(500),lat:z.number().min(-34).max(6),lon:z.number().min(-74).max(-34)}),
  radius:z.number().int().min(1).max(10).default(3), keyword:z.string().trim().max(100).default('')
});
export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function safeLink(value) {
  try { const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:''; } catch { return ''; }
}
const string = (value,max=500) => typeof value==='string'?value.trim().slice(0,max):'';
const website = value => {const text=string(value,2048);return safeLink(/^https?:\/\//i.test(text)?text:`https://${text}`);};
export function osmProspects(data,query) {
  const segment=categories.find(x=>x.id===query.category).label;
  return (data.elements||[]).filter(x=>x.tags?.name&&['node','way','relation'].includes(x.type)).slice(0,100).map(x=>{
    const t=x.tags, lat=x.lat??x.center?.lat,lon=x.lon??x.center?.lon;
    const email=string(t['contact:email']||t.email,254);
    return {key:`osm:${x.type}:${x.id}`,name:string(t.name,120),segment,
      phone:string(t['contact:phone']||t.phone,40),email:z.email().safeParse(email).success?email:'',
      website:website(t['contact:website']||t.website),instagram:string(t['contact:instagram'],120),
      city:string(t['addr:city'],120),state:/^[A-Z]{2}$/.test(t['addr:state']||'')?t['addr:state']:'',neighborhood:string(t['addr:suburb']||t['addr:neighbourhood'],120),
      address:[t['addr:street'],t['addr:housenumber'],t['addr:suburb'],t['addr:city']].filter(Boolean).join(', ').slice(0,500),
      sourceUrl:`https://www.openstreetmap.org/${x.type}/${x.id}`,source:'OpenStreetMap',description:'',lat,lon};
  });
}
export function webProspects(data,query) {
  const seen=new Set();
  return (data.results||[]).flatMap(x=>{
    const url=safeLink(x.url);if(!url||seen.has(url))return [];seen.add(url);
    return [{key:`web:${hash(url)}`,name:string(x.title,120),segment:categories.find(x=>x.id===query.category).label,
      phone:'',email:'',website:'',instagram:'',city:'',state:'',neighborhood:'',address:'',
      sourceUrl:url,source:'Pesquisa web',description:string(x.content,600)}];
  }).slice(0,50);
}
export class ProviderError extends Error { constructor(message,status=502) {super(message);this.status=status;} }
export async function fetchJSON(url,options={},fetcher=fetch) {
  let response;
  try {response=await fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(22000)});} catch(error) {console.warn('AWDevelop provider request failed',{name:error?.name,code:error?.cause?.code||error?.code||'network_error'});throw new ProviderError('A fonte de busca está indisponível. Tente novamente mais tarde.');}
  if(!response.ok) throw new ProviderError(response.status===429?'A fonte atingiu seu limite de consultas. Aguarde para tentar novamente.':'A fonte de busca não respondeu corretamente.',response.status===429?429:502);
  if(Number(response.headers.get('content-length'))>2500000)throw new ProviderError('A busca retornou dados demais. Reduza o raio.');
  const reader=response.body.getReader();const chunks=[];let size=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2500000){await reader.cancel();throw new ProviderError('A busca retornou dados demais. Reduza o raio.');}chunks.push(value);}}
  catch(error){if(error instanceof ProviderError)throw error;throw new ProviderError('Não foi possível receber o resultado da busca.');}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new ProviderError('A fonte retornou um formato inválido.');}
}
export async function searchExternal(query,{fetcher=fetch,env=process.env}={}) {
  if(query.provider==='web') {
    const endpoint=env.SEARXNG_INTERNAL_URL||env.SEARXNG_URL;
    if(!endpoint)throw new ProviderError('A pesquisa web ainda precisa de um servidor SearXNG configurado. A busca de negócios no OpenStreetMap está disponível.',503);
    const url=new URL(env.SEARXNG_INTERNAL_URL?'search':'/search',endpoint);if(url.protocol!=='https:'&&!(env.SEARXNG_INTERNAL_URL&&url.protocol==='http:'))throw new ProviderError('O servidor de pesquisa web precisa usar HTTPS.',503);
    url.search=new URLSearchParams({q:[categories.find(x=>x.id===query.category).label,query.keyword,query.location.name].filter(Boolean).join(' ').slice(0,500),format:'json',language:'pt-BR',safesearch:'1'}).toString();
    if(env.SEARXNG_INTERNAL_URL&&(!env.BETTER_AUTH_SECRET||env.BETTER_AUTH_SECRET.length<32))throw new ProviderError('A pesquisa web privada não recebeu a configuração de autenticação.',503);
    const token=env.SEARXNG_INTERNAL_URL?createHmac('sha256',env.BETTER_AUTH_SECRET).update('awdevelop:searxng:v1').digest('hex'):env.SEARXNG_TOKEN;
    const headers=token?{Authorization:`Bearer ${token}`} : {};
    return webProspects(await fetchJSON(url,{headers},fetcher),query);
  }
  const category=categories.find(x=>x.id===query.category);
  const q=`[out:json][timeout:18];nwr(around:${query.radius*1000},${query.location.lat},${query.location.lon})["${category.key}"~"^(${category.value})$"][name];out center 100;`;
  const data=await fetchJSON(env.OVERPASS_URL||'https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'AWDevelopLeads/1.0 (+https://awdevelop-globe.vercel.app)'},body:new URLSearchParams({data:q}).toString()},fetcher);
  if(data.remark)throw new ProviderError('A fonte interrompeu a busca. Reduza o raio e tente novamente.');
  const prospects=osmProspects(data,query);
  return query.keyword?prospects.filter(x=>x.name.toLocaleLowerCase('pt-BR').includes(query.keyword.toLocaleLowerCase('pt-BR'))):prospects;
}

