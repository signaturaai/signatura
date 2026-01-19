/**
 * Dashboard Home - Redirects to Companion
 *
 * The companion is the heart of the application.
 */

import { redirect } from 'next/navigation'

export default function DashboardPage() {
  redirect('/companion')
}
