import { randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { normalizeContent } from './content-normalizer.js';
import { contentSchema } from './content-schema.js';
export const digest = value => createHash('sha256').update(value).digest('hex');
export async function memberFor(pool,email){
 const {rows}=await pool.query('SELECT email,name,role,active FROM aw_members WHERE email=$1',[email.toLowerCase()]);return rows[0];
}
const revisionSchema=z.object({revision:z.number().int().nonnegative()});
export const quoteSchema=z.object({requestId:z.uuid(),name:z.string().trim().min(2).max(120),email:z.email().max(254).transform(x=>x.toLowerCase()),phone:z.string().trim().max(40).default(''),company:z.string().trim().max(200).default(''),service:z.string().trim().min(2).max(150),idea:z.string().trim().min(10).max(5000),stage:z.string().trim().max(200).default(''),timeline:z.string().trim().max(100).default(''),consent:z.literal(true),website:z.string().max(200).default('')});
export function installManagement(app,{db}){
 const publisher=(req,res,next)=>['owner','admin'].includes(req.role)?next():res.status(403).json({error:'Sua conta não pode publicar ou acessar esta área.'});
 const owner=(req,res,next)=>req.role==='owner'?next():res.status(403).json({error:'Somente o proprietário pode gerenciar administradores.'});
 app.get('/api/admin/me',(req,res)=>res.json({email:req.email,role:req.role,name:req.editorName}));
 app.get('/api/admin/history',async(req,res)=>{
  const before=req.query.before&&/^\d+$/.test(req.query.before)?req.query.before:null;
  const {rows}=await db().query('SELECT p.id,p.revision,p.created_at,COALESCE(u.name,\'Publicação inicial\') AS editor_name FROM aw_publications p LEFT JOIN "user" u ON u.id=p.editor WHERE ($1::bigint IS NULL OR p.id<$1) ORDER BY p.id DESC LIMIT 30',[before]);res.json({items:rows,next:rows.length===30?rows.at(-1).id:null});
 });
 app.get('/api/admin/history/:id',async(req,res)=>{
  if(!/^\d+$/.test(req.params.id))return res.status(400).json({error:'Versão inválida.'});
  const {rows}=await db().query('SELECT id,content,revision,created_at FROM aw_publications WHERE id=$1',[req.params.id]);if(!rows[0])return res.status(404).json({error:'Versão não encontrada.'});res.json({...rows[0],content:normalizeContent(rows[0].content)});
 });
 app.post('/api/admin/history/:id/restore',async(req,res)=>{
  const {revision}=revisionSchema.parse(req.body);if(!/^\d+$/.test(req.params.id))return res.status(400).json({error:'Versão inválida.'});
  const c=await db().connect();try{
   await c.query('BEGIN');const saved=await c.query('SELECT content FROM aw_publications WHERE id=$1',[req.params.id]);if(!saved.rows[0]){await c.query('ROLLBACK');return res.status(404).json({error:'Versão não encontrada.'});}
   const content=contentSchema.parse(saved.rows[0].content);
   const result=await c.query('UPDATE aw_content SET draft=$1::jsonb,revision=revision+1,updated_at=now() WHERE id=1 AND revision=$2 RETURNING revision',[JSON.stringify(content),revision]);
   if(!result.rows[0]){await c.query('ROLLBACK');return res.status(409).json({error:'O rascunho mudou. Recarregue antes de restaurar.'});}
   await c.query('INSERT INTO aw_activity (editor,action,details) VALUES ($1,\'restore\',$2::jsonb)',[req.editor,JSON.stringify({publication:req.params.id})]);await c.query('COMMIT');res.json(result.rows[0]);
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 });
 app.get('/api/admin/media',async(req,res)=>{const {rows}=await db().query('SELECT id,url,label,created_at FROM aw_media ORDER BY created_at DESC LIMIT 200');res.json({items:rows});});
 app.get('/api/admin/notifications',publisher,async(req,res)=>{
  const {rows}=await db().query(`WITH unread AS (SELECT q.id,q.name,q.service,q.created_at FROM aw_quotes q WHERE NOT EXISTS(SELECT 1 FROM aw_quote_reads r WHERE r.member_email=$1 AND r.quote_id=q.id)), recent AS (SELECT id::text AS id,name,service,created_at FROM unread ORDER BY id::bigint DESC LIMIT 5) SELECT (SELECT count(*)::integer FROM unread) AS count,COALESCE((SELECT max(id)::text FROM unread),'0') AS latest,COALESCE((SELECT json_agg(recent ORDER BY id::bigint DESC) FROM recent),'[]'::json) AS items`,[req.email]);const tasks=(await db().query(`SELECT t.id::text,t.quote_id::text,t.title,q.name,t.due_at,count(*) OVER()::int AS total FROM aw_crm_tasks t JOIN aw_quotes q ON q.id=t.quote_id WHERE t.assignee=$1 AND NOT t.done AND t.due_at<=now() ORDER BY t.due_at LIMIT 5`,[req.email])).rows;res.json({...rows[0],tasks,taskCount:tasks[0]?.total||0});
 });
 app.post('/api/admin/notifications/read',publisher,async(req,res)=>{
  const {through}=z.object({through:z.string().regex(/^\d+$/).max(18)}).parse(req.body);
  await db().query('INSERT INTO aw_quote_reads (member_email,quote_id) SELECT $1,id FROM aw_quotes WHERE id<=$2::bigint ON CONFLICT DO NOTHING',[req.email,through]);res.json({ok:true});
 });
 app.get('/api/admin/quotes',publisher,async(req,res)=>{
  const schema=z.object({status:z.enum(['all','new','talking','proposal','won','lost']).default('all'),search:z.string().max(100).default(''),before:z.coerce.number().int().positive().optional()});const q=schema.parse(req.query);
  const {rows}=await db().query(`SELECT id,name,email,phone,company,service,idea,stage,timeline,status,notes,revision,created_at FROM aw_quotes WHERE ($1='all' OR status=$1) AND ($2='' OR name ILIKE '%'||$2||'%' OR email ILIKE '%'||$2||'%' OR company ILIKE '%'||$2||'%') AND ($3::bigint IS NULL OR id<$3) ORDER BY id DESC LIMIT 30`,[q.status,q.search,q.before||null]);res.json({items:rows,next:rows.length===30?rows.at(-1).id:null});
 });
 app.patch('/api/admin/quotes/:id',publisher,async(req,res)=>{
  const data=z.object({status:z.enum(['new','talking','proposal','won','lost']),notes:z.string().max(5000),revision:z.number().int().nonnegative()}).parse(req.body);if(!/^\d+$/.test(req.params.id))return res.status(400).json({error:'Pedido inválido.'});
  const {rows}=await db().query(`UPDATE aw_quotes SET status=$1,notes=$2,crm_stage=CASE WHEN $1=status THEN crm_stage ELSE CASE $1 WHEN 'talking' THEN 'contact' WHEN 'proposal' THEN 'proposal' WHEN 'won' THEN 'won' WHEN 'lost' THEN 'lost' ELSE 'new' END END,revision=revision+1,updated_at=now() WHERE id=$3 AND revision=$4 RETURNING revision`,[data.status,data.notes,req.params.id,data.revision]);if(!rows[0])return res.status(409).json({error:'Este pedido mudou. Atualize a lista antes de salvar.'});res.json(rows[0]);
 });
 app.get('/api/admin/members',owner,async(req,res)=>{
  const {rows}=await db().query('SELECT m.email,m.name,m.role,m.active,(u.id IS NOT NULL) AS registered FROM aw_members m LEFT JOIN "user" u ON u.email=m.email ORDER BY m.created_at');res.json({items:rows});
 });
 app.post('/api/admin/invites',owner,async(req,res)=>{
  const data=z.object({email:z.email().max(254).transform(x=>x.toLowerCase()),name:z.string().trim().min(2).max(100),role:z.enum(['admin','editor'])}).parse(req.body);
  const token=randomBytes(48).toString('base64url'),hash=digest(token),c=await db().connect();try{
   await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(3909020)');
   const existing=await c.query('SELECT id FROM "user" WHERE email=$1',[data.email]);if(existing.rowCount){await c.query('ROLLBACK');return res.status(409).json({error:'Esta conta já existe. Altere suas permissões na lista de administradores.'});}
   const m=await c.query('SELECT role FROM aw_members WHERE email=$1',[data.email]);if(m.rows[0]?.role==='owner'){await c.query('ROLLBACK');return res.status(403).json({error:'Não é possível substituir o proprietário.'});}
   await c.query('UPDATE aw_setup_invites SET consumed_at=now() WHERE email=$1 AND consumed_at IS NULL',[data.email]);
   await c.query(`INSERT INTO aw_members (email,name,role,active) VALUES ($1,$2,$3,true) ON CONFLICT (email) DO UPDATE SET name=$2,role=$3,active=true`,[data.email,data.name,data.role]);
   await c.query(`INSERT INTO aw_setup_invites (token_hash,email,name,role,expires_at) VALUES ($1,$2,$3,$4,now()+interval '7 days')`,[hash,data.email,data.name,data.role]);await c.query('COMMIT');
   const origin=new URL(process.env.BETTER_AUTH_URL).origin;res.status(201).json({url:origin+'/admin/setup.html#'+token,expiresDays:7});
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 });
 app.patch('/api/admin/members',owner,async(req,res)=>{
  const data=z.object({email:z.email().transform(x=>x.toLowerCase()),role:z.enum(['admin','editor']),active:z.boolean()}).parse(req.body);
  if(data.email===process.env.ADMIN_EMAIL.toLowerCase()||data.email===req.email)return res.status(403).json({error:'O proprietário mantém seu acesso.'});
  const c=await db().connect();try{await c.query('BEGIN');const result=await c.query(`UPDATE aw_members SET role=$1,active=$2 WHERE email=$3 AND role<>'owner' RETURNING email`,[data.role,data.active,data.email]);if(!result.rows[0]){await c.query('ROLLBACK');return res.status(404).json({error:'Administrador não encontrado.'});}
   if(!data.active){await c.query('DELETE FROM session WHERE "userId" IN (SELECT id FROM "user" WHERE email=$1)',[data.email]);await c.query('UPDATE aw_setup_invites SET consumed_at=now() WHERE email=$1 AND consumed_at IS NULL',[data.email]);}
   await c.query('COMMIT');res.json({ok:true});}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 });
 app.post('/api/admin/presence',async(req,res)=>{
  const {tabId}=z.object({tabId:z.uuid()}).parse(req.body);await db().query('INSERT INTO aw_presence (tab_id,editor,name,seen_at) VALUES ($1,$2,$3,now()) ON CONFLICT (tab_id) DO UPDATE SET seen_at=now(),editor=$2,name=$3',[tabId,req.editor,req.editorName]);
  const {rows}=await db().query(`SELECT name,seen_at FROM aw_presence WHERE tab_id<>$1 AND seen_at>now()-interval '75 seconds' ORDER BY seen_at DESC LIMIT 10`,[tabId]);res.json({items:rows});
 });
 app.delete('/api/admin/presence/:id',async(req,res)=>{if(z.uuid().safeParse(req.params.id).success)await db().query('DELETE FROM aw_presence WHERE tab_id=$1 AND editor=$2',[req.params.id,req.editor]);res.json({ok:true});});
}

