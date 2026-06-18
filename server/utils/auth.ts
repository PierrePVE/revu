/**
 * server/utils/auth.ts — authentication helpers.
 *
 * Passwords are hashed with bcryptjs. Sessions are stateless JSON Web Tokens
 * (jose, HS256) stored in an httpOnly cookie — never in localStorage, which is
 * exposed to XSS. All exports are auto-imported into server routes by Nitro.
 */
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

/** Name of the cookie holding the session token. */
export const COOKIE_SESSION = 'revu_session'

/** Session lifetime in seconds (7 days) — used for both the JWT and the cookie. */
export const DUREE_SESSION = 7 * 24 * 60 * 60

/** Data carried inside the session token. */
export interface SessionPayload {
  commerceId: string
  slug: string
}

/** HMAC key derived from NUXT_JWT_SECRET (set in .env). */
function cleSecrete(): Uint8Array {
  const secret = process.env.NUXT_JWT_SECRET
  if (!secret) throw createError({ statusCode: 500, message: 'NUXT_JWT_SECRET is not configured.' })
  return new TextEncoder().encode(secret)
}

/** Hash a plaintext password (bcrypt, cost factor 10). */
export function hasherMotDePasse(motDePasse: string): Promise<string> {
  return bcrypt.hash(motDePasse, 10)
}

/** Compare a plaintext password against a stored bcrypt hash. */
export function verifierMotDePasse(motDePasse: string, hash: string): Promise<boolean> {
  return bcrypt.compare(motDePasse, hash)
}

/** Sign a session token (HS256, 7-day expiry). */
export function signerSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ commerceId: payload.commerceId, slug: payload.slug })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.commerceId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(cleSecrete())
}

/**
 * Verify a session token. Returns its payload, or null when the token is
 * missing, malformed, tampered with, or expired.
 */
export async function verifierSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, cleSecrete())
    return { commerceId: String(payload.commerceId), slug: String(payload.slug) }
  } catch {
    return null
  }
}
