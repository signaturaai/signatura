/**
 * Supabase Client Exports
 *
 * Import from here based on your context:
 * - Browser components: use createClient from './client'
 * - Server components/actions: use createClient from './server'
 * - Middleware: use updateSession from './middleware'
 */

export { createClient, getClient } from './client'
export { createClient as createServerClient, createServiceClient } from './server'
export { updateSession } from './middleware'
