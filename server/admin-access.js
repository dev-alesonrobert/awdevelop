import { createHash, timingSafeEqual } from 'node:crypto';
const normalized = value => value?.trim().toLowerCase();
export function isAdmin(email) {
  const allowed = [process.env.ADMIN_EMAIL, process.env.PARTNER_ADMIN_EMAIL].map(normalized).filter(Boolean);
  return allowed.includes(normalized(email));
}
export function setupRecipient(token) {
  if (typeof token !== 'string' || !token || token.length > 200) return null;
  const candidates = [
    { email:process.env.ADMIN_EMAIL, token:process.env.ADMIN_SETUP_TOKEN, name:'Aleson Roberto' },
    { email:process.env.PARTNER_ADMIN_EMAIL, token:process.env.PARTNER_ADMIN_SETUP_TOKEN, name:'Welligton' },
  ];
  const digest = createHash('sha256').update(token).digest();
  for (const candidate of candidates) {
    if (candidate.email && candidate.token && timingSafeEqual(digest, createHash('sha256').update(candidate.token).digest())) {
      return {email:normalized(candidate.email),name:candidate.name,hash:digest.toString('hex')};
    }
  }
  return null;
}
