import { betterAuth } from 'better-auth';
import { getPool } from './db.js';
let auth;
export function createAuth({ provisioning = false } = {}) {
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) throw new Error('Configure um segredo de autenticação com ao menos 32 caracteres.');
  return betterAuth({
    database: getPool(), secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    emailAndPassword: { enabled: true, disableSignUp: !provisioning, minPasswordLength: 12 },
    session: { expiresIn: 86400, updateAge: 3600 },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 20,
      customRules: { '/sign-in/email': { window: 60, max: 5 } } },
  });
}
export function getAuth() { return auth ??= createAuth(); }
