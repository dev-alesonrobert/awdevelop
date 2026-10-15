import {googleLimits} from './google-budget.js';
import {googleEnabled} from './google-places.js';
import {aiDailyLimit,aiEnabled} from './usage-policy.js';

export const commercialSummarySql=`
 SELECT q.crm_stage,count(*)::int AS count,COALESCE(sum(q.estimated_value),0)::text AS value,
 count(*) FILTER(WHERE EXISTS(
 SELECT 1 FROM aw_crm_events e WHERE e.quote_id=q.id
 AND e.kind IN ('call','meeting','proposal','whatsapp','email','approach','response')
 ))::int AS contacted
 FROM aw_quotes q GROUP BY q.crm_stage`;

export const usageSummarySql=`
 WITH clock AS (
 SELECT now() AS updated_at,
 (now() AT TIME ZONE 'America/Sao_Paulo')::date AS day,
 to_char(now() AT TIME ZONE 'America/Los_Angeles','YYYY-MM') AS month,
 ((date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo')+interval '1 day') AT TIME ZONE 'America/Sao_Paulo') AS day_reset,
 ((date_trunc('month',now() AT TIME ZONE 'America/Los_Angeles')+interval '1 month') AT TIME ZONE 'America/Los_Angeles') AS month_reset
 )
 SELECT c.updated_at,c.day_reset,c.month_reset,
 COALESCE((SELECT count FROM aw_google_usage WHERE period='day:'||c.day::text AND kind='search'),0) AS search_day,
 COALESCE((SELECT count FROM aw_google_usage WHERE period='month:'||c.month AND kind='search'),0) AS search_month,
 COALESCE((SELECT count FROM aw_google_usage WHERE period='day:'||c.day::text AND kind='details'),0) AS details_day,
 COALESCE((SELECT count FROM aw_google_usage WHERE period='month:'||c.month AND kind='details'),0) AS details_month,
 COALESCE((SELECT count FROM aw_ai_usage WHERE day=c.day),0) AS ai_day,
 COALESCE((SELECT count FROM aw_prospect_usage WHERE day=c.day),0) AS other_day
 FROM clock c`;

export function summarizeCommercial(rows) {
 const items=rows.map(row=>({stage:row.crm_stage,count:Number(row.count),value:Number(row.value)}));
 const count=stage=>items.find(item=>item.stage===stage)?.count||0;
 const won=count('won'),lost=count('lost'),closed=won+lost;
 return {
  stages:items,total:items.reduce((n,item)=>n+item.count,0),
  openValue:items.filter(item=>!['won','lost'].includes(item.stage)).reduce((n,item)=>n+item.value,0),
  contacted:rows.reduce((n,row)=>n+Number(row.contacted),0),
  won,lost,closed,winRate:closed?Math.round(won/closed*1000)/10:null,
 };
}
export function quota(used,limit,resetsAt) {
 used=Number(used);
 return {used,limit,remaining:Math.max(0,limit-used),percent:limit?Math.min(100,Math.round(used/limit*100)):100,resetsAt};
}
export function summarizeUsage(row,env) {
 const limits=googleLimits(env),google=googleEnabled(env);
 return [
 {id:'google-search',label:'Buscas Google Maps',enabled:google,daily:quota(row.search_day,limits.search.daily,row.day_reset),monthly:quota(row.search_month,limits.search.monthly,row.month_reset)},
 {id:'google-details',label:'Detalhes Google Maps',enabled:google,daily:quota(row.details_day,limits.details.daily,row.day_reset),monthly:quota(row.details_month,limits.details.monthly,row.month_reset)},
 {id:'ai',label:'Abordagens com IA',enabled:aiEnabled(env),daily:quota(row.ai_day,aiDailyLimit(env),row.day_reset)},
 {id:'other',label:'Outras buscas externas',enabled:true,daily:quota(row.other_day,200,row.day_reset)},
 ];
}
export function installInsights(app,{db,env=process.env}) {
 app.get('/api/admin/crm/insights',async(req,res)=>{
  // Read-only counters. This endpoint never contacts Google or an AI provider.
  const [commercial,usage]=await Promise.all([db().query(commercialSummarySql),db().query(usageSummarySql)]);
  const row=usage.rows[0];
  res.json({commercial:summarizeCommercial(commercial.rows),usage:summarizeUsage(row,env),updatedAt:row.updated_at});
 });
}
