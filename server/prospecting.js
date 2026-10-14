import { googleLimits, reserveGoogleCall } from './google-budget.js';
import { googleEnabled, searchGoogle, googleDetails, verifyDetailToken } from './google-places.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { installApproaches } from './approaches.js';
import { categories, searchSchema, hash, safeLink, fetchJSON, searchExternal, ProviderError } from './prospect-providers.js';

const email=z.union([z.literal(''),z.email().max(254)]);
const importSchema=z.object({searchId:z.uuid(),key:z.string().max(120),name:z.string().trim().min(2).max(120),phone:z.string().trim().max(40),email,website:z.union([z.literal(''),z.url().max(2048)]).refine(x=>!x||safeLink(x)),service:z.string().trim().min(2).max(150)});
export function installProspecting(app,{db,fetcher=fetch,env=process.env,generate}) {
  app.use('/api/admin/prospecting',(req,res,next)=>['owner','admin'].includes(req.role)?next():res.status(403).json({error:'Sua conta não possui acesso à prospecção.'}));
  installApproaches(app,{db,env,generate});
  const fail=(res,error)=>{if(error instanceof ProviderError)return res.status(error.status).json({error:error.message});throw error;};
  async function cached(key) {return (await db().query('SELECT id,payload,created_at FROM aw_prospect_cache WHERE cache_key=$1 AND expires_at>now()',[key])).rows[0];}
  async function cache(key,payload,days) {
    return (await db().query("INSERT INTO aw_prospect_cache(id,cache_key,payload,expires_at) VALUES($1,$2,$3::jsonb,now()+($4::int*interval '1 day')) ON CONFLICT(cache_key) DO UPDATE SET id=EXCLUDED.id,payload=EXCLUDED.payload,created_at=now(),expires_at=EXCLUDED.expires_at RETURNING id,payload,created_at",[randomUUID(),key,JSON.stringify(payload),days])).rows[0];
  }
  async function throttle(provider) {
    const row=(await db().query("INSERT INTO aw_prospect_limits(key,next_at) VALUES($1,now()+interval '2 seconds') ON CONFLICT(key) DO UPDATE SET next_at=now()+interval '2 seconds' WHERE aw_prospect_limits.next_at<=now() RETURNING key",[provider])).rows[0];
    if(!row)throw new ProviderError('Aguarde alguns segundos antes de fazer outra busca.',429);
    if(provider==='google-search'||provider==='google-details'){
      await reserveGoogleCall(db(),provider==='google-search'?'search':'details',env);
      return;
    }
    const daily=(await db().query("INSERT INTO aw_prospect_usage(day,count) VALUES((now() AT TIME ZONE 'America/Sao_Paulo')::date,1) ON CONFLICT(day) DO UPDATE SET count=aw_prospect_usage.count+1 WHERE aw_prospect_usage.count<200 RETURNING count")).rows[0];
    if(!daily)throw new ProviderError('O limite diário de buscas externas foi atingido. Consultas já armazenadas continuam disponíveis.',429);
  }
  app.get('/api/admin/prospecting/config',(req,res)=>res.json({categories:categories.map(({id,label})=>({id,label})),webEnabled:Boolean(env.SEARXNG_INTERNAL_URL||env.SEARXNG_URL),osmEnabled:env.PROSPECTING_OSM_DISABLED!=='true',googleEnabled:googleEnabled(env),googleLimits:googleLimits(env),otherDailyLimit:200}));
  app.get('/api/admin/prospecting/locations',async(req,res)=>{
    const q=z.string().trim().min(3).max(150).parse(req.query.q),key=`geo:${hash(q.toLocaleLowerCase('pt-BR'))}`;
    try {
      const previous=await cached(key);if(previous)return res.json({items:previous.payload.items,cached:true});
      await throttle('nominatim');
      const url=new URL('/search',env.NOMINATIM_URL||'https://nominatim.openstreetmap.org');
      url.search=new URLSearchParams({q,format:'jsonv2',countrycodes:'br',limit:'5','accept-language':'pt-BR'}).toString();
      const data=await fetchJSON(url,{headers:{'User-Agent':'AWDevelopLeads/1.0 (+https://awdevelop-globe.vercel.app)'}},fetcher);
      if(!Array.isArray(data))throw new ProviderError('A fonte não retornou localidades válidas.');
      const items=data.slice(0,5).map(x=>({name:String(x.display_name).slice(0,500),lat:Number(x.lat),lon:Number(x.lon)})).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lon));
      await cache(key,{items},30);res.json({items,cached:false});
    }catch(error){return fail(res,error);}
  });
  app.post('/api/admin/prospecting/google-details',async(req,res)=>{
    res.set('Cache-Control','private, no-store');
    const token=z.string().min(1).max(2500).parse(req.body.token);
    try {
      if(!googleEnabled(env))throw new ProviderError('Cadastre a chave Google Places no servidor para habilitar esta fonte.',503);
      // Validate the signed, user-bound reference before reserving a paid call.
      verifyDetailToken(token,req.email,env);
      await throttle('google-details');
      res.json({item:await googleDetails(token,{env,fetcher,user:req.email})});
    }catch(error){return fail(res,error);}
  });
  app.post('/api/admin/prospecting/search',async(req,res)=>{
    const query=searchSchema.parse(req.body),key=`search:${hash(query)}`;
    try {
      if(query.provider==='google'){
        res.set('Cache-Control','private, no-store');
        if(!googleEnabled(env))throw new ProviderError('Cadastre a chave Google Places no servidor para habilitar esta fonte.',503);
        await throttle('google-search');
        const items=await searchGoogle(query,{env,fetcher,user:req.email});
        return res.json({searchId:randomUUID(),items,cached:false,searchedAt:new Date().toISOString(),provider:'google'});
      }
      if(query.provider==='osm'&&env.PROSPECTING_OSM_DISABLED==='true')throw new ProviderError('A busca OpenStreetMap está temporariamente desativada.',503);
      const previous=await cached(key);if(previous)return res.json({searchId:previous.id,items:previous.payload.items,cached:true,searchedAt:previous.created_at});
      if(query.provider==='web'&&!env.SEARXNG_INTERNAL_URL&&!env.SEARXNG_URL)throw new ProviderError('Configure o servidor SearXNG para habilitar a pesquisa web.',503);
      await throttle(query.provider);
      const items=await searchExternal(query,{fetcher,env});
      const saved=await cache(key,{items,query},1);
      res.json({searchId:saved.id,items,cached:false,searchedAt:saved.created_at});
    }catch(error){return fail(res,error);}
  });
  app.post('/api/admin/prospecting/import',async(req,res)=>{
    const input=importSchema.parse(req.body);
    if(input.key.startsWith('google:'))return res.status(400).json({error:'Os dados do Google são apenas para consulta. Cadastre no CRM dados obtidos diretamente com a empresa.'});
    const record=(await db().query('SELECT payload FROM aw_prospect_cache WHERE id=$1 AND expires_at>now()',[input.searchId])).rows[0];
    const candidate=record?.payload.items?.find(x=>x.key===input.key);
    if(!candidate)return res.status(409).json({error:'Este resultado expirou. Faça uma nova busca antes de salvar.'});
    const c=await db().connect();
    try {
      await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(3909031)');
      const phone=input.phone.replace(/\D/g,''),site=input.website?new URL(input.website).hostname.toLowerCase().replace(/^www\./,''):'';
      const previous=(await c.query("SELECT id FROM aw_quotes WHERE prospect_source_key=$1 OR ($2<>'' AND lower(email)=lower($2)) OR ($3<>'' AND regexp_replace(phone,'[^0-9]','','g')=$3) OR ($4<>'' AND lower(regexp_replace(regexp_replace(contact_website,'^https?://(www\\.)?','','i'),'/.*$',''))=$4) ORDER BY id LIMIT 1",[input.key,input.email,phone,site])).rows[0];
      if(previous){await c.query('ROLLBACK');return res.json({id:previous.id,duplicate:true});}
      const quote=(await c.query("INSERT INTO aw_quotes(request_id,payload_hash,name,email,phone,company,service,idea,stage,timeline,origin,contact_website,city,state,neighborhood,segment,prospect_source_key,prospect_source_url,instagram) VALUES($1,$2,$3,$4,$5,$3,$6,$7,'','',$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id",[randomUUID(),hash(input),input.name,input.email.toLowerCase(),input.phone,input.service,[candidate.address,candidate.description,`Fonte: ${candidate.sourceUrl}`,`Região pesquisada: ${record.payload.query.location.name}`].filter(Boolean).join('\n'),candidate.source,input.website,candidate.city,candidate.state,candidate.neighborhood,candidate.segment,candidate.key,candidate.sourceUrl,candidate.instagram])).rows[0];
      await c.query('INSERT INTO aw_crm_events(quote_id,actor,kind,body) VALUES($1,$2,$3,$4)',[quote.id,req.email,'created',`Lead importado de ${candidate.source}. ${candidate.sourceUrl}`]);
      await c.query('COMMIT');res.status(201).json({id:quote.id,duplicate:false});
    }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
  });
  app.post('/api/admin/prospecting/crm-status',async(req,res)=>{
    const keys=z.array(z.string().min(1).max(120)).max(100).parse(req.body.keys);
    const unique=[...new Set(keys)].filter(key=>!key.startsWith('google:'));
    if(!unique.length)return res.json({items:[]});
    const {rows}=await db().query('SELECT id,prospect_source_key AS key,crm_stage AS stage FROM aw_quotes WHERE prospect_source_key=ANY($1::text[])',[unique]);
    res.set('Cache-Control','private, no-store').json({items:rows});
  });
}



