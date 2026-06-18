/**
 * middleware/auth.ts — guards merchant pages.
 *
 * Redirects to /login when the request carries no valid session. Applied per
 * page via definePageMeta({ middleware: 'auth' }). Real authorization is still
 * enforced server-side in the API; this middleware is just for the UX flow.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  let commerce: { slug?: string } | undefined
  try {
    // useRequestFetch forwards the cookie during SSR; on the client the browser
    // attaches it automatically (same-origin).
    commerce = await useRequestFetch()('/api/auth/me')
  } catch {
    return navigateTo('/login')
  }

  // The dashboard reads its commerce from ?slug — fill it from the session when
  // missing, so a bare /dashboard still shows the logged-in merchant's data.
  if (to.path === '/dashboard' && !to.query.slug && commerce?.slug) {
    return navigateTo(`/dashboard?slug=${encodeURIComponent(commerce.slug)}`)
  }
})
