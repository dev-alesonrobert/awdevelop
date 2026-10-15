// Shared with the AI reservation path so the dashboard reports the effective limit.
export const aiDailyLimit = env => Math.min(200,Math.max(1,Number.parseInt(env.PROSPECTING_AI_DAILY_LIMIT,10)||20));
export const aiEnabled = env => Boolean(env.PROSPECTING_AI_ENABLED==='true'&&env.AI_GATEWAY_MODEL?.trim()&&env.AI_GATEWAY_API_KEY?.trim());
