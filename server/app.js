import express from 'express';
import { normalizeContent } from './content-normalizer.js';
import {installMeetings} from './meetings.js';
import {installProspecting} from './prospecting.js';
import {installCRM} from './crm.js';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { put } from '@vercel/blob';
import { randomUUID, createHash } from 'node:crypto';
import { memberFor, installManagement, quoteSchema, digest } from './management.js';
import { getAuth, createAuth } from './auth.js';
import { getPool } from './db.js';
import { contentSchema, saveSchema } from './content-schema.js';

export function createApp({ auth = getAuth, db = getPool, upload = put, provision = () => createAuth({ provisioning:true }), access = email => memberFor(db(),email), prospectingFetch = fetch, prospectingEnv = process.env, approachGenerate, meetingsEnv = process.env } = {}) {
const app = express();
app.disable('x-powered-by');
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  next();
});
app.all('/api/auth/*splat', (req, res, next) => {
  try { return toNodeHandler(auth())(req, res); } catch (e) { next(e); }
});
app.post('/api/setup', express.json({ limit:'8kb' }), async (req, res) => {
  const expectedOrigin = new URL(process.env.BETTER_AUTH_URL || 'http://localhost:3000').origin;
  if (req.headers.origin !== expectedOrigin) return res.status(403).json({ error:'Origem inválida.' });
  if (typeof req.body?.token !== 'string' || req.body.token.length<20 || req.body.token.length>200) return res.status(401).json({ error:'Convite inválido.' });
  const hash=digest(req.body.token);
  if (typeof req.body.password !== 'string' || req.body.password.length < 12 || req.body.password.length > 128 || req.body.password !== req.body.confirmation) return res.status(400).json({ error:'Use uma senha de 12 a 128 caracteres e confirme a mesma senha.' });
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(3909020)');
    const invite = await client.query('SELECT email,name,role,consumed_at,expires_at FROM aw_setup_invites WHERE token_hash=$1 FOR UPDATE', [hash]);
    if (!invite.rows[0] || invite.rows[0].consumed_at || (invite.rows[0].expires_at && new Date(invite.rows[0].expires_at)<=new Date())) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error:'Este convite já foi usado ou não está disponível. Entre no painel com sua senha.' });
    }
    const recipient={...invite.rows[0],hash};
    const member=await client.query('SELECT active FROM aw_members WHERE email=$1',[recipient.email]);
    if(!member.rows[0]?.active){await client.query('ROLLBACK');return res.status(403).json({error:'Este acesso não está autorizado.'});}
    const existing = await client.query('SELECT id FROM "user" WHERE email=$1', [recipient.email]);
    if (existing.rowCount) {
      await client.query('UPDATE aw_setup_invites SET consumed_at=now() WHERE token_hash=$1', [recipient.hash]);
      await client.query('COMMIT');
      return res.status(409).json({ error:'Sua conta já está configurada. Este convite foi invalidado. Entre no painel com sua senha.' });
    }
    await provision().api.signUpEmail({ body:{name:recipient.name, email:recipient.email, password:req.body.password} });
    await client.query('UPDATE aw_setup_invites SET consumed_at=now() WHERE token_hash=$1', [recipient.hash]);
    await client.query('COMMIT');
    res.json({ ok:true });
  } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
});
app.post('/api/quotes',express.json({limit:'16kb'}),async(req,res)=>{
 const origin=new URL(process.env.BETTER_AUTH_URL||'http://localhost:3000').origin;
 if(req.headers.origin!==origin)return res.status(403).json({error:'Origem inválida.'});
 const q=quoteSchema.parse(req.body);if(q.website)return res.status(202).json({ok:true});
 const {requestId,website,...payload}=q,hash=digest(JSON.stringify(payload));
 const c=await db().connect();try{
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[requestId]);
  const duplicate=await c.query('SELECT payload_hash FROM aw_quotes WHERE request_id=$1',[requestId]);
  if(duplicate.rows[0]){await c.query('ROLLBACK');return duplicate.rows[0].payload_hash===hash?res.json({ok:true}):res.status(409).json({error:'A solicitação mudou. Recarregue o formulário.'});}
  const key=digest(q.email+':'+Math.floor(Date.now()/3600000));
  const limited=await c.query('INSERT INTO aw_quote_limits (key,count) VALUES ($1,1) ON CONFLICT(key) DO UPDATE SET count=aw_quote_limits.count+1 WHERE aw_quote_limits.count<5 RETURNING count',[key]);
  if(!limited.rows[0]){await c.query('ROLLBACK');return res.status(429).json({error:'Muitas solicitações. Tente novamente mais tarde.'});}
  await c.query('INSERT INTO aw_quotes (request_id,payload_hash,name,email,phone,company,service,idea,stage,timeline) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[requestId,hash,q.name,q.email,q.phone,q.company,q.service,q.idea,q.stage,q.timeline]);await c.query('COMMIT');res.status(201).json({ok:true});
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
});
app.get('/api/content', async (req, res) => {
  const { rows } = await db().query('SELECT published, published_at FROM aw_content WHERE id=1');
  if (!rows[0]) return res.status(503).json({ error: 'Conteúdo não inicializado.' });
  res.json({ content: normalizeContent(rows[0].published), publishedAt: rows[0].published_at });
});
app.use('/api/admin', async (req, res, next) => {
  const session = await auth().api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) return res.status(401).json({ error: 'Entre com sua conta administrativa.' });
  const member=await access(session.user.email);
  if(!member?.active)return res.status(401).json({error:'Sua conta não possui acesso ativo.'});
  if (!['GET', 'HEAD'].includes(req.method)) {
    const expected = new URL(process.env.BETTER_AUTH_URL || 'http://localhost:3000').origin;
    if (req.headers.origin !== expected) return res.status(403).json({ error: 'Origem inválida.' });
  }
  req.editor = session.user.id;req.email=session.user.email.toLowerCase();req.role=member.role;req.editorName=member.name;
  next();
});
app.use('/api/admin',express.json({limit:'256kb',type:'application/json'}));
installManagement(app,{db});
installMeetings(app,{env:meetingsEnv});
installCRM(app,{db});
installProspecting(app,{db,fetcher:prospectingFetch,env:prospectingEnv,generate:approachGenerate});
app.get('/api/admin/content', async (req, res) => {
  const { rows } = await db().query('SELECT draft, revision, published_revision, updated_at, published_at FROM aw_content WHERE id=1');
  if (!rows[0]) return res.status(503).json({ error:'Conteúdo não inicializado. Execute a migração do banco.' });
  res.json({...rows[0], draft: normalizeContent(rows[0].draft)});
});
app.put('/api/admin/content', express.json({ limit: '256kb' }), async (req, res) => {
  const { revision, content } = saveSchema.parse(req.body);
  const { rows } = await db().query('UPDATE aw_content SET draft=$1::jsonb, revision=revision+1, updated_at=now() WHERE id=1 AND revision=$2 RETURNING revision, published_revision, updated_at', [JSON.stringify(content), revision]);
  if (!rows[0]) return res.status(409).json({ error: 'Outra aba alterou o rascunho. Recarregue antes de salvar.' });
  res.json(rows[0]);
});
app.post('/api/admin/publish', (req,res,next)=>['admin','owner'].includes(req.role)?next():res.status(403).json({error:'Sua conta pode editar, mas não publicar.'}), express.json({ limit: '1kb' }), async (req, res) => {
  const revision = req.body?.revision;
  if (!Number.isInteger(revision)) return res.status(400).json({ error: 'Revisão inválida.' });
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT draft, revision FROM aw_content WHERE id=1 FOR UPDATE');
    if (!rows[0] || rows[0].revision !== revision) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'O rascunho mudou. Recarregue e revise novamente.' });
    }
    contentSchema.parse(rows[0].draft);
    await client.query('INSERT INTO aw_publications (content, revision, editor) VALUES ($1::jsonb,$2,$3)', [JSON.stringify(rows[0].draft), revision, req.editor]);
    const result = await client.query('UPDATE aw_content SET published=draft, published_revision=revision, published_at=now() WHERE id=1 RETURNING published_revision, published_at');
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
});
app.post('/api/admin/upload', express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '4mb' }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: 'Envie uma imagem PNG, JPG ou WebP de até 4 MB.' });
  const b = req.body;
  const type = req.headers['content-type'];
  const valid = type === 'image/png' ? b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : type === 'image/jpeg' ? b[0] === 255 && b[1] === 216 && b[2] === 255 : b.subarray(0,4).toString() === 'RIFF' && b.subarray(8,12).toString() === 'WEBP';
  if (!valid) return res.status(400).json({ error: 'O arquivo não corresponde ao formato informado.' });
  const ext = { 'image/png':'png', 'image/jpeg':'jpg', 'image/webp':'webp' }[type];
  const result = await upload(`awdevelop/${randomUUID()}.${ext}`, b, { access: 'public', contentType: type, addRandomSuffix: true });
  await db().query('INSERT INTO aw_media (url,label,editor) VALUES ($1,$2,$3) ON CONFLICT(url) DO NOTHING',[result.url,'Imagem enviada',req.editor]);
  res.json({ url: result.url });
});
app.use((error, req, res, next) => {
  if (error.name === 'ZodError') return res.status(400).json({ error: 'Confira os campos preenchidos.', fields: error.issues.map(x => ({ path:x.path.join('.'), message:x.message })) });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'A imagem deve ter até 4 MB.' });
  console.error('awdevelop API:', error.name, error.code || 'request_failed');
  res.status(503).json({ error: 'Não foi possível concluir agora. Tente novamente.' });
});

return app;
}
export const app = createApp();


