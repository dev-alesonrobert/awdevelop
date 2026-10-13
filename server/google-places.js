import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { categories, fetchJSON, ProviderError, safeLink } from './prospect-providers.js';

const placeIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,250}$/);
export const googleEnabled = env => Boolean(env.GOOGLE_PLACES_API_KEY?.trim() && env.BETTER_AUTH_SECRET?.length >= 32);
const fields = 'id,displayName,formattedAddress,googleMapsUri,attributions';
const text = value => typeof value === 'string' ? value.slice(0,500) : '';
function ready(env) {
  if (!googleEnabled(env)) throw new ProviderError('Cadastre a chave Google Places no servidor para habilitar esta fonte.',503);
}
function sign(value, env) {
  return createHmac('sha256',env.BETTER_AUTH_SECRET).update('awdevelop:google-places:v1:'+value).digest('base64url');
}
export function detailToken(placeId, segment, user, env, now=Date.now()) {
  const payload = Buffer.from(JSON.stringify({placeId,segment,user,expires:now+15*60*1000})).toString('base64url');
  return payload+'.'+sign(payload,env);
}
export function verifyDetailToken(token, user, env, now=Date.now()) {
  ready(env);
  const parts = String(token).split('.');
  if(parts.length!==2 || token.length>2500) throw new ProviderError('Refaça a busca antes de consultar os detalhes.',409);
  const expected=Buffer.from(sign(parts[0],env)), supplied=Buffer.from(parts[1]);
  if(expected.length!==supplied.length || !timingSafeEqual(expected,supplied)) throw new ProviderError('Esta referência de busca é inválida.',409);
  let payload;
  try {payload=JSON.parse(Buffer.from(parts[0],'base64url').toString());} catch {throw new ProviderError('Esta referência de busca é inválida.',409);}
  if(payload.user!==user || !Number.isFinite(payload.expires) || payload.expires<=now || !placeIdSchema.safeParse(payload.placeId).success || typeof payload.segment!=='string') throw new ProviderError('Refaça a busca antes de consultar os detalhes.',409);
  return payload;
}
function normalize(place,segment) {
  const placeId=placeIdSchema.parse(place.id);
  return {key:'google:'+placeId,placeId,name:text(place.displayName?.text),segment,
    address:text(place.formattedAddress),phone:text(place.internationalPhoneNumber||place.nationalPhoneNumber),
    website:safeLink(place.websiteUri),email:'',instagram:'',city:'',state:'',neighborhood:'',
    source:'Google Maps',sourceUrl:safeLink(place.googleMapsUri)||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeId)}&query_place_id=${encodeURIComponent(placeId)}`,
    description:'',attributions:(Array.isArray(place.attributions)?place.attributions:[]).slice(0,20).map(x=>({name:text(x.provider),url:safeLink(x.providerUri)}))};
}
async function request(url,options,{env,fetcher}) {
  ready(env);
  return fetchJSON(url,{...options,headers:{...options.headers,'X-Goog-Api-Key':env.GOOGLE_PLACES_API_KEY}},fetcher);
}
export async function searchGoogle(query,{env,fetcher,user}) {
  const segment=categories.find(x=>x.id===query.category).label;
  const data=await request('https://places.googleapis.com/v1/places:searchText',{
    method:'POST',headers:{'Content-Type':'application/json','X-Goog-FieldMask':fields.split(',').map(x=>'places.'+x).join(',')},
    body:JSON.stringify({textQuery:[segment,query.keyword,query.location.name].filter(Boolean).join(' '),languageCode:'pt-BR',regionCode:'BR',pageSize:20,locationBias:{circle:{center:{latitude:query.location.lat,longitude:query.location.lon},radius:query.radius*1000}}})
  },{env,fetcher});
  if(!data || typeof data!=='object') throw new ProviderError('O Google retornou um formato inválido.');
  if(data.places!==undefined&&!Array.isArray(data.places)) throw new ProviderError('O Google não retornou uma lista válida.');
  const seen=new Set();
  return (data.places||[]).slice(0,20).filter(x=>placeIdSchema.safeParse(x.id).success&&!seen.has(x.id)&&seen.add(x.id)).map(x=>({...normalize(x,segment),detailToken:detailToken(x.id,segment,user,env)}));
}
export async function googleDetails(token,{env,fetcher,user}) {
  const reference=verifyDetailToken(token,user,env);
  const url=new URL('https://places.googleapis.com/v1/places/'+encodeURIComponent(reference.placeId));
  url.searchParams.set('languageCode','pt-BR');
  const data=await request(url,{headers:{'X-Goog-FieldMask':fields+',internationalPhoneNumber,websiteUri'}},{env,fetcher});
  if(!data || data.id!==reference.placeId) throw new ProviderError('O Google retornou uma referência diferente da consultada.');
  return {...normalize(data,reference.segment),detailToken:token,detailsLoaded:true};
}
