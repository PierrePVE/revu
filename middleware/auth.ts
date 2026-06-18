/**
 * middleware/auth.ts — guards merchant pages.
 *
 * Redirects to /login when the request carries no valid session. Applied per
 * page via definePageMeta({ middleware: 'auth' }). Real authorization is still
 * enforced server-side in the API; this middleware is just for the UX flow.
 */
export default defineNuxtRouteMiddleware(async () => {
  try {
    // useRequestFetch forwards the cookie during SSR; on the client the browser
    // attaches it automatically (same-origin).
    await useRequestFetch()('/api/auth/me')
  } catch {
    return navigateTo('/login')
  }
})
