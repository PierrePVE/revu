/**
 * server/api/auth/logout.post.ts — POST /api/auth/logout
 * Clears the session cookie. Always succeeds (idempotent).
 */
export default defineEventHandler((event) => {
  deleteCookie(event, COOKIE_SESSION, { path: '/' })
  return { success: true }
})
