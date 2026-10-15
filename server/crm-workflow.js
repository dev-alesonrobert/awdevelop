import {z} from 'zod';
export const contactKinds = ['note','call','meeting','proposal','whatsapp','email','approach','response'];
export const contactQueueSql = `
 WITH bounds AS (
 SELECT (date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo') AS start_at,
 ((date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo')+interval '1 day') AT TIME ZONE 'America/Sao_Paulo') AS end_at
 ), queue AS (
 SELECT 'task'::text AS kind,t.id,q.id AS lead_id,q.name,q.company,t.title,t.due_at,t.assignee,t.revision,
 CASE WHEN t.due_at<b.start_at THEN 'overdue' ELSE 'today' END AS bucket
 FROM aw_crm_tasks t JOIN aw_quotes q ON q.id=t.quote_id CROSS JOIN bounds b
 WHERE NOT t.done AND t.due_at<b.end_at AND q.crm_stage NOT IN ('won','lost')
 AND ($1::text IS NULL OR t.assignee=$1)
 UNION ALL
 SELECT 'first',q.id,q.id,q.name,q.company,'Primeiro contato',NULL::timestamptz,q.assignee,q.revision,'first'
 FROM aw_quotes q WHERE q.crm_stage='new' AND ($1::text IS NULL OR q.assignee=$1)
 AND NOT EXISTS(SELECT 1 FROM aw_crm_events e WHERE e.quote_id=q.id AND e.kind IN ('call','meeting','proposal','whatsapp','email','approach','response'))
 AND NOT EXISTS(SELECT 1 FROM aw_crm_tasks t WHERE t.quote_id=q.id AND NOT t.done)
 )
 SELECT *,count(*) OVER()::int AS total FROM queue
 ORDER BY CASE bucket WHEN 'overdue' THEN 0 WHEN 'today' THEN 1 ELSE 2 END,due_at NULLS LAST,lead_id,id LIMIT 100`;

export const duplicateSchema=z.object({
 email:z.string().trim().max(254).default(''),phone:z.string().trim().max(40).default(''),
 website:z.string().trim().max(2048).default(''),company:z.string().trim().max(200).default(''),
 name:z.string().trim().max(120).default(''),city:z.string().trim().max(120).default(''),
 excludeId:z.string().regex(/^\d+$/).max(18).optional(),
});
export function identityKeys(data) {
 const fold=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 let phone=data.phone.replace(/\D/g,'');if(/^55\d{10,11}$/.test(phone))phone=phone.slice(2);
 if(phone.length<8)phone='';
 let host='';try {const u=new URL(data.website);if(['http:','https:'].includes(u.protocol))host=u.hostname.toLowerCase().replace(/^www\./,'');}catch{}
 // Shared social/directory domains are not business identities.
 if(/(^|\.)(instagram\.com|facebook\.com|google\.com|wa\.me|linktr\.ee)$/.test(host))host='';
 return [data.email.toLowerCase(),phone,host,fold(data.company||data.name),fold(data.city),data.excludeId||null];
}
const foldSql=field=>`regexp_replace(translate(lower(${field}),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'),'[^a-z0-9]','','g')`;
export const duplicateSql=`
 WITH identities AS (
 SELECT id,name,company,assignee,crm_stage,
 lower(trim(email)) AS email_key,
 regexp_replace(regexp_replace(phone,'[^0-9]','','g'),'^55([0-9]{10,11})$','\\1') AS phone_key,
 lower(split_part(split_part(regexp_replace(contact_website,'^https?://(www\\.)?','','i'),'/',1),':',1)) AS host_key,
 ${foldSql("COALESCE(NULLIF(company,''),name)")} AS company_key,${foldSql('city')} AS city_key
 FROM aw_quotes WHERE ($6::bigint IS NULL OR id<>$6)
 ), matches AS (
 SELECT id,name,company,assignee,crm_stage,
 array_remove(ARRAY[
 CASE WHEN $1<>'' AND email_key=$1 THEN 'E-mail' END,
 CASE WHEN $2<>'' AND phone_key=$2 THEN 'Telefone' END,
 CASE WHEN $3<>'' AND host_key=$3 THEN 'Site' END,
 CASE WHEN length($4)>=4 AND $5<>'' AND company_key=$4 AND city_key=$5 THEN 'Empresa e cidade' END
 ],NULL) AS reasons FROM identities
 )
 SELECT m.*,(SELECT max(created_at) FROM aw_crm_events e WHERE e.quote_id=m.id AND e.kind IN ('call','meeting','proposal','whatsapp','email','approach','response')) AS last_contact_at
 FROM matches m WHERE cardinality(reasons)>0 ORDER BY id DESC LIMIT 10`;

export function installWorkflow(app,{db}) {
 app.get('/api/admin/crm/contact-queue',async(req,res)=>{
 const {scope}=z.object({scope:z.enum(['mine','team']).default('mine')}).parse(req.query);
 const rows=(await db().query(contactQueueSql,[scope==='mine'?req.email:null])).rows;
 res.json({items:rows.map(({total,...item})=>item),total:rows[0]?.total||0,timezone:'America/Sao_Paulo'});
 });
 app.post('/api/admin/crm/duplicates',async(req,res)=>{
 const data=duplicateSchema.parse(req.body),items=(await db().query(duplicateSql,identityKeys(data))).rows;
 res.json({items});
 });
}
