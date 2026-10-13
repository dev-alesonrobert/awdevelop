import { ProviderError } from './prospect-providers.js';

// Keep headroom below Google's monthly free caps (5,000 searches / 1,000 details).
const maximum = {search:{daily:150,monthly:4500},details:{daily:30,monthly:900}};
function setting(raw, cap) {
  if(raw===undefined || raw==='')return cap;
  const value=Number(raw);
  if(!/^\d+$/.test(String(raw)) || !Number.isSafeInteger(value))throw new ProviderError('Confira os limites de uso Google configurados no servidor.',503);
  return Math.min(value,cap);
}
export function googleLimits(env=process.env) {
  return Object.fromEntries(Object.entries(maximum).map(([kind,caps])=>[kind,{
    daily:setting(env[`GOOGLE_PLACES_${kind.toUpperCase()}_DAILY_LIMIT`],caps.daily),
    monthly:setting(env[`GOOGLE_PLACES_${kind.toUpperCase()}_MONTHLY_LIMIT`],caps.monthly),
  }]));
}
export const reservationSql = `INSERT INTO aw_google_usage(period,kind,count)
  SELECT $1,$2,1 WHERE $3::int>0
  ON CONFLICT(period,kind) DO UPDATE SET count=aw_google_usage.count+1
  WHERE aw_google_usage.count<$3 RETURNING count`;
export async function reserveGoogleCall(pool,kind,env=process.env) {
  const limit=googleLimits(env)[kind];
  if(!limit)throw new ProviderError('Operação Google inválida.',400);
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    // Same row and conditional increment serialize concurrent calls across all instances.
    // Reserve monthly first, then daily; a daily rejection rolls back both.
    const periods=(await client.query(`SELECT
      'month:'||to_char(now() AT TIME ZONE 'America/Los_Angeles','YYYY-MM') AS month,
      'day:'||to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD') AS day`)).rows[0];
    const monthly=(await client.query(reservationSql,[periods.month,kind,limit.monthly])).rows[0];
    if(!monthly)throw new ProviderError(`O limite mensal de ${kind==='search'?'buscas':'detalhes'} Google foi atingido. Novas chamadas foram bloqueadas para proteger a franquia.`,429);
    const daily=(await client.query(reservationSql,[periods.day,kind,limit.daily])).rows[0];
    if(!daily)throw new ProviderError(`O limite diário de ${kind==='search'?'buscas':'detalhes'} Google foi atingido. Ele reinicia à meia-noite no horário de Brasília.`,429);
    await client.query('COMMIT');
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {client.release();}
  // Failed network attempts are never refunded: their billing outcome may be unknown.
}
