import { auth } from './auth.js';

export async function getSession(headers: Headers) {
  return auth.api.getSession({ headers });
}

export async function requireSession(headers: Headers) {
  const session = await getSession(headers);
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
