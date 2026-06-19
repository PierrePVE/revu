export default defineNuxtRouteMiddleware(async () => {
  try {
    const me = await useRequestFetch()('/api/auth/me')
    if ((me as { role?: string })?.role !== 'admin') return navigateTo('/login')
  } catch {
    return navigateTo('/login')
  }
})