import {z} from 'zod';
import {installInsights} from './crm-insights.js';
import {installWorkflow,contactKinds} from './crm-workflow.js';
import {randomUUID} from 'node:crypto';
import { leadFiltersSchema, buildLeadFilters } from './lead-filters.js';
import {digest} from './management.js';
export const stages=['new','contact','meeting','proposal','negotiation','won','lost'];
const id=z.string().regex(/^\d+$/).max(18);
const blankEmail=z.union([z.email().max(254),z.literal('')]).transform(x=>x.toLowerCase());
const website=z.union([z.url().max(2048).refine(x=>/^https?:\/\//.test(x)),z.literal('')]);
export const leadSchema=z.object({city:z.string().trim().max(120).default(''),state:z.string().trim().max(2).default(''),neighborhood:z.string().trim().max(120).default(''),segment:z.string().trim().max(120).default(''),priority:z.enum(['low','medium','high']).default('medium'),instagram:z.string().trim().max(120).default(''),name:z.string().trim().min(2).max(120),email:blankEmail,phone:z.string().trim().max(40),company:z.string().trim().max(200),website,service:z.string().trim().min(2).max(150),idea:z.string().trim().max(5000),origin:z.string().trim().min(2).max(120),crmStage:z.enum(stages),assignee:blankEmail,value:z.number().finite().min(0).max(100000000),expectedClose:z.union([z.iso.date(),z.literal('')])});
const legacyStatus={new:'new',contact:'talking',meeting:'talking',proposal:'proposal',negotiation:'proposal',won:'won',lost:'lost'};
export function installCRM(app,{db}){
 const commercial=(req,res,next)=>['owner','admin'].includes(req.role)?next():res.status(403).json({error:'Sua conta não possui acesso ao CRM.'});
 app.use('/api/admin/crm',commercial);
 installWorkflow(app,{db});
 installInsights(app,{db});
 const assignable=async(c,email)=>!email||(await c.query("SELECT email FROM aw_members WHERE email=$1 AND active=true AND role IN ('owner','admin')",[email])).rowCount>0;
 const event=(c,lead,req,kind,body)=>c.query('INSERT INTO aw_crm_events (quote_id,actor,kind,body) VALUES ($1,$2,$3,$4)',[lead,req.email,kind,body]);
 app.get('/api/admin/crm/team',async(req,res)=>{res.json({items:(await db().query("SELECT email,name FROM aw_members WHERE active=true AND role IN ('owner','admin') ORDER BY name")).rows});});
 app.get('/api/admin/crm/leads',async(req,res)=>{
  const q=leadFiltersSchema.parse(req.query);
  const {where,values}=buildLeadFilters(q);
  const {rows}=await db().query(`SELECT id,name,company,service,crm_stage,assignee,estimated_value,expected_close,revision,origin,email,phone,contact_website,created_at,city,state,neighborhood,segment,priority,instagram FROM aw_quotes WHERE ${where} AND ($${values.length+1}::bigint IS NULL OR id<$${values.length+1}) ORDER BY id DESC LIMIT 100`,[...values,q.before||null]);
  const stats=(await db().query(`SELECT crm_stage,count(*)::int AS count,COALESCE(sum(estimated_value),0) AS value FROM aw_quotes WHERE ${where} GROUP BY crm_stage`,values)).rows;
  res.json({items:rows,stats,next:rows.length===100?rows.at(-1).id:null});
 });
 app.get('/api/admin/crm/leads/:id',async(req,res)=>{
  const leadId=id.parse(req.params.id);const lead=(await db().query('SELECT * FROM aw_quotes WHERE id=$1',[leadId])).rows[0];if(!lead)return res.status(404).json({error:'Oportunidade não encontrada.'});
  const events=(await db().query('SELECT id,actor,kind,body,created_at FROM aw_crm_events WHERE quote_id=$1 ORDER BY id DESC LIMIT 100',[leadId])).rows;
  const tasks=(await db().query('SELECT id,title,assignee,due_at,done,revision FROM aw_crm_tasks WHERE quote_id=$1 ORDER BY done,due_at,id',[leadId])).rows;res.json({lead,events,tasks});
 });
 app.post('/api/admin/crm/leads',async(req,res)=>{
  const data=leadSchema.parse(req.body),requestId=z.uuid().parse(req.body.requestId);const hash=digest(JSON.stringify(data));const c=await db().connect();try{
   await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[requestId]);
   const existing=(await c.query('SELECT id,payload_hash FROM aw_quotes WHERE request_id=$1',[requestId])).rows[0];if(existing){await c.query('ROLLBACK');return existing.payload_hash===hash?res.json({id:existing.id}):res.status(409).json({error:'Este cadastro já foi enviado com outros dados. Reabra Novo lead.'});}
   if(!await assignable(c,data.assignee)){await c.query('ROLLBACK');return res.status(400).json({error:'Escolha um responsável com acesso comercial ativo.'});}
   const {rows}=await c.query(`INSERT INTO aw_quotes (request_id,payload_hash,name,email,phone,company,service,idea,stage,timeline,origin,crm_stage,assignee,estimated_value,expected_close,status,contact_website,city,state,neighborhood,segment,priority,instagram) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'','',$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING id`,[requestId,hash,data.name,data.email,data.phone,data.company,data.service,data.idea,data.origin,data.crmStage,data.assignee||null,data.value,data.expectedClose||null,legacyStatus[data.crmStage],data.website,data.city,data.state.toUpperCase(),data.neighborhood,data.segment,data.priority,data.instagram]);
   await event(c,rows[0].id,req,'created','Lead cadastrado manualmente.');await c.query('COMMIT');res.status(201).json(rows[0]);
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 });
 app.patch('/api/admin/crm/leads/:id',async(req,res)=>{
  const leadId=id.parse(req.params.id),data=leadSchema.parse(req.body),revision=z.number().int().nonnegative().parse(req.body.revision);const c=await db().connect();try{
   await c.query('BEGIN');if(!await assignable(c,data.assignee)){await c.query('ROLLBACK');return res.status(400).json({error:'Responsável sem acesso comercial ativo.'});}
   const previous=(await c.query('SELECT crm_stage,assignee,estimated_value FROM aw_quotes WHERE id=$1',[leadId])).rows[0];
   const result=await c.query(`UPDATE aw_quotes SET name=$1,email=$2,phone=$3,company=$4,service=$5,idea=$6,origin=$7,crm_stage=$8,assignee=$9,estimated_value=$10,expected_close=$11,status=$12,contact_website=$13,city=$16,state=$17,neighborhood=$18,segment=$19,priority=$20,instagram=$21,revision=revision+1,updated_at=now() WHERE id=$14 AND revision=$15 RETURNING revision`,[data.name,data.email,data.phone,data.company,data.service,data.idea,data.origin,data.crmStage,data.assignee||null,data.value,data.expectedClose||null,legacyStatus[data.crmStage],data.website,leadId,revision,data.city,data.state.toUpperCase(),data.neighborhood,data.segment,data.priority,data.instagram]);
   if(!result.rowCount){await c.query('ROLLBACK');return res.status(409).json({error:'Esta oportunidade mudou. Reabra a ficha antes de salvar; seus campos atuais foram preservados.'});}
   await event(c,leadId,req,'updated',`Ficha atualizada. Etapa: ${previous.crm_stage} → ${data.crmStage}. Responsável: ${previous.assignee||'sem responsável'} → ${data.assignee||'sem responsável'}. Valor: ${previous.estimated_value} → ${data.value}.`);await c.query('COMMIT');res.json(result.rows[0]);
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 });
 app.post('/api/admin/crm/leads/:id/events',async(req,res)=>{
  const leadId=id.parse(req.params.id),data=z.object({kind:z.enum(contactKinds),body:z.string().trim().min(2).max(5000)}).parse(req.body);
  const result=await db().query('INSERT INTO aw_crm_events (quote_id,actor,kind,body) SELECT id,$2,$3,$4 FROM aw_quotes WHERE id=$1 RETURNING id',[leadId,req.email,data.kind,data.body]);if(!result.rowCount)return res.status(404).json({error:'Oportunidade não encontrada.'});res.status(201).json({ok:true});
 });
 app.post('/api/admin/crm/leads/:id/tasks',async(req,res)=>{
  const leadId=id.parse(req.params.id),data=z.object({requestId:z.uuid(),title:z.string().trim().min(2).max(200),assignee:z.email().transform(x=>x.toLowerCase()),dueAt:z.iso.datetime({offset:true})}).parse(req.body);const c=await db().connect();try{
   await c.query('BEGIN');if(!await assignable(c,data.assignee)){await c.query('ROLLBACK');return res.status(400).json({error:'Responsável sem acesso comercial ativo.'});}
   const result=await c.query('INSERT INTO aw_crm_tasks (quote_id,request_id,title,assignee,due_at) SELECT id,$2,$3,$4,$5 FROM aw_quotes WHERE id=$1 ON CONFLICT(request_id) DO NOTHING RETURNING id',[leadId,data.requestId,data.title,data.assignee,data.dueAt]);
   if(result.rowCount)await event(c,leadId,req,'task',`Tarefa: ${data.title}. Responsável: ${data.assignee}. Prazo: ${data.dueAt}.`);
   else if(!(await c.query('SELECT id FROM aw_crm_tasks WHERE request_id=$1 AND quote_id=$2',[data.requestId,leadId])).rowCount){await c.query('ROLLBACK');return res.status(404).json({error:'Oportunidade não encontrada.'});}
   await c.query('COMMIT');res.status(201).json({ok:true});
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 });
 app.patch('/api/admin/crm/tasks/:id',async(req,res)=>{
  const taskId=id.parse(req.params.id),data=z.object({done:z.boolean(),revision:z.number().int().nonnegative()}).parse(req.body);const c=await db().connect();try{
   await c.query('BEGIN');const result=await c.query('UPDATE aw_crm_tasks SET done=$1,revision=revision+1 WHERE id=$2 AND revision=$3 RETURNING revision,quote_id,title',[data.done,taskId,data.revision]);if(!result.rowCount){await c.query('ROLLBACK');return res.status(409).json({error:'Esta tarefa mudou. Atualize a ficha.'});}
   await event(c,result.rows[0].quote_id,req,'task',`${data.done?'Concluída':'Reaberta'}: ${result.rows[0].title}.`);await c.query('COMMIT');res.json({revision:result.rows[0].revision});
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 });
}
