import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getMigrations } from 'better-auth/db/migration';
import { getAuth } from '../server/auth.js';
import { getPool } from '../server/db.js';
import { contentSchema } from '../server/content-schema.js';
const { runMigrations } = await getMigrations(getAuth().options);
await runMigrations();
await getPool().query(`CREATE TABLE IF NOT EXISTS aw_content (
  id integer PRIMARY KEY CHECK (id=1), draft jsonb NOT NULL, published jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 0, published_revision integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS aw_setup_invites (
  token_hash text PRIMARY KEY, email text NOT NULL, consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS aw_publications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, content jsonb NOT NULL,
  revision integer NOT NULL, editor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);`);
await getPool().query(`
 ALTER TABLE aw_setup_invites ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Administrador';
 ALTER TABLE aw_setup_invites ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';
 ALTER TABLE aw_setup_invites ADD COLUMN IF NOT EXISTS expires_at timestamptz;
 CREATE TABLE IF NOT EXISTS aw_members (email text PRIMARY KEY,name text NOT NULL,role text NOT NULL CHECK(role IN ('owner','admin','editor')),active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS aw_media (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,url text UNIQUE NOT NULL,label text NOT NULL,editor text,created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS aw_quotes (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,request_id uuid UNIQUE NOT NULL,payload_hash text NOT NULL,name text NOT NULL,email text NOT NULL,phone text NOT NULL,company text NOT NULL,service text NOT NULL,idea text NOT NULL,stage text NOT NULL,timeline text NOT NULL,status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','talking','proposal','won','lost')),notes text NOT NULL DEFAULT '',revision integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
 ALTER TABLE aw_quotes ADD COLUMN IF NOT EXISTS crm_stage text NOT NULL DEFAULT 'new' CHECK(crm_stage IN ('new','contact','meeting','proposal','negotiation','won','lost'));
 ALTER TABLE aw_quotes ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'Landing page';
 ALTER TABLE aw_quotes ADD COLUMN IF NOT EXISTS assignee text REFERENCES aw_members(email);
 ALTER TABLE aw_quotes ADD COLUMN IF NOT EXISTS estimated_value numeric(14,2) NOT NULL DEFAULT 0 CHECK(estimated_value>=0);
 ALTER TABLE aw_quotes ADD COLUMN IF NOT EXISTS expected_close date;
 CREATE TABLE IF NOT EXISTS aw_prospect_cache(id uuid PRIMARY KEY,cache_key text UNIQUE NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL);
 CREATE TABLE IF NOT EXISTS aw_prospect_limits(key text PRIMARY KEY,next_at timestamptz NOT NULL);
 CREATE TABLE IF NOT EXISTS aw_prospect_usage(day date PRIMARY KEY,count integer NOT NULL);
 CREATE TABLE IF NOT EXISTS aw_ai_usage(day date PRIMARY KEY,count integer NOT NULL CHECK(count>=0));
 ALTER TABLE aw_quotes ADD COLUMN IF NOT EXISTS prospect_source_key text;
 ALTER TABLE aw_quotes ADD COLUMN IF NOT EXISTS prospect_source_url text NOT NULL DEFAULT '';
 CREATE UNIQUE INDEX IF NOT EXISTS aw_quotes_prospect_key ON aw_quotes(prospect_source_key) WHERE prospect_source_key IS NOT NULL;
 ALTER TABLE aw_quotes ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '';
 ALTER TABLE aw_quotes ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT '';
 ALTER TABLE aw_quotes ADD COLUMN IF NOT EXISTS neighborhood text NOT NULL DEFAULT '';
 ALTER TABLE aw_quotes ADD COLUMN IF NOT EXISTS segment text NOT NULL DEFAULT '';
 ALTER TABLE aw_quotes ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high'));
 ALTER TABLE aw_quotes ADD COLUMN IF NOT EXISTS instagram text NOT NULL DEFAULT '';
 ALTER TABLE aw_quotes ADD COLUMN IF NOT EXISTS contact_website text NOT NULL DEFAULT '';
 CREATE TABLE IF NOT EXISTS aw_crm_events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,quote_id bigint NOT NULL REFERENCES aw_quotes(id) ON DELETE CASCADE,actor text NOT NULL,kind text NOT NULL,body text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS aw_crm_tasks (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,quote_id bigint NOT NULL REFERENCES aw_quotes(id) ON DELETE CASCADE,request_id uuid UNIQUE NOT NULL,title text NOT NULL,assignee text NOT NULL REFERENCES aw_members(email),due_at timestamptz NOT NULL,done boolean NOT NULL DEFAULT false,revision integer NOT NULL DEFAULT 0);
 CREATE INDEX IF NOT EXISTS aw_crm_tasks_due ON aw_crm_tasks(assignee,due_at) WHERE done=false;
 INSERT INTO aw_crm_events (quote_id,actor,kind,body) SELECT id,'system','imported','Solicitação recebida pela landing page.' FROM aw_quotes q WHERE NOT EXISTS(SELECT 1 FROM aw_crm_events e WHERE e.quote_id=q.id);
 UPDATE aw_quotes q SET crm_stage=CASE status WHEN 'talking' THEN 'contact' WHEN 'proposal' THEN 'proposal' WHEN 'won' THEN 'won' WHEN 'lost' THEN 'lost' ELSE 'new' END WHERE NOT EXISTS(SELECT 1 FROM aw_crm_events e WHERE e.quote_id=q.id AND e.actor<>'system');
 CREATE TABLE IF NOT EXISTS aw_quote_reads (member_email text NOT NULL REFERENCES aw_members(email) ON DELETE CASCADE,quote_id bigint NOT NULL REFERENCES aw_quotes(id) ON DELETE CASCADE,PRIMARY KEY(member_email,quote_id));
 CREATE TABLE IF NOT EXISTS aw_quote_limits (key text PRIMARY KEY,count integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS aw_presence (tab_id uuid PRIMARY KEY,editor text NOT NULL,name text NOT NULL,seen_at timestamptz NOT NULL);
 CREATE TABLE IF NOT EXISTS aw_activity (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,editor text NOT NULL,action text NOT NULL,details jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX IF NOT EXISTS aw_quotes_status_created ON aw_quotes(status,created_at DESC);
`);
// Persist budgets across deploys. Seed only once, counting all earlier external calls
// conservatively against BOTH Google SKUs plus 60 calls of rollout headroom.
await getPool().query(`BEGIN;
 SELECT pg_advisory_xact_lock(3909032);
 CREATE TABLE IF NOT EXISTS aw_google_usage (
   period text NOT NULL,kind text NOT NULL CHECK(kind IN ('search','details')),
   count integer NOT NULL DEFAULT 0 CHECK(count>=0),PRIMARY KEY(period,kind)
 );
 INSERT INTO aw_google_usage(period,kind,count)
 SELECT 'month:'||to_char(now() AT TIME ZONE 'America/Los_Angeles','YYYY-MM'),k.kind,
   (SELECT COALESCE(sum(count),0)+60 FROM aw_prospect_usage
    WHERE day >= date_trunc('month',now() AT TIME ZONE 'America/Los_Angeles')::date-1)::int
 FROM (VALUES ('search'),('details')) AS k(kind)
 WHERE NOT EXISTS(SELECT 1 FROM aw_google_usage)
 ON CONFLICT(period,kind) DO NOTHING;
 COMMIT;`);
for(const [email,name,role] of [[process.env.ADMIN_EMAIL,'Aleson Roberto','owner'],[process.env.PARTNER_ADMIN_EMAIL,'Welligton','admin']]){
 if(email)await getPool().query('INSERT INTO aw_members (email,name,role) VALUES ($1,$2,$3) ON CONFLICT(email) DO NOTHING',[email.toLowerCase(),name,role]);
}
const initial = contentSchema.parse(JSON.parse(await readFile(new URL('../dist/content-default.json', import.meta.url), 'utf8')));
await getPool().query('INSERT INTO aw_content (id,draft,published) VALUES (1,$1::jsonb,$1::jsonb) ON CONFLICT (id) DO NOTHING', [JSON.stringify(initial)]);
await getPool().query(`INSERT INTO aw_publications (content,revision,editor,created_at) SELECT published,published_revision,'initial',published_at FROM aw_content WHERE id=1 AND NOT EXISTS(SELECT 1 FROM aw_publications)`);
const current=(await getPool().query('SELECT draft,published FROM aw_content WHERE id=1')).rows[0];
for(const content of [current.draft,current.published])for(const [url,label] of [[content.settings.logo,'Logo'],...content.portfolio.projects.map(p=>[p.image,p.title])]){
 await getPool().query('INSERT INTO aw_media (url,label) VALUES ($1,$2) ON CONFLICT(url) DO NOTHING',[url,label]);
}
await getPool().query("DELETE FROM aw_presence WHERE seen_at<now()-interval '1 day'; DELETE FROM aw_quote_limits WHERE created_at<now()-interval '2 days'");
// Preserve consumption across deployments and account deletion. Never reset consumed_at.
for (const [email,token] of [[process.env.ADMIN_EMAIL,process.env.ADMIN_SETUP_TOKEN],[process.env.PARTNER_ADMIN_EMAIL,process.env.PARTNER_ADMIN_SETUP_TOKEN]]) {
  if (!email || !token) continue;
  const hash=createHash('sha256').update(token).digest('hex');
  const recipient=email.trim().toLowerCase();
  await getPool().query(`INSERT INTO aw_setup_invites (token_hash,email,consumed_at)
    VALUES ($1,$2,CASE WHEN EXISTS (SELECT 1 FROM "user" WHERE email=$2) THEN now() ELSE NULL END)
    ON CONFLICT (token_hash) DO NOTHING`,[hash,recipient]);
  await getPool().query(`UPDATE aw_setup_invites SET consumed_at=now()
    WHERE token_hash=$1 AND consumed_at IS NULL AND EXISTS (SELECT 1 FROM "user" WHERE email=$2)`,[hash,recipient]);
}
await getPool().end();
console.log('Banco inicializado. Conteúdo existente preservado.');


