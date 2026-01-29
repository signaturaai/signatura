/**
 * Dashboard Home - Redirects to Dashboard
 *
 * Main entry point for authenticated users.
 */

import { redirect } from 'next/navigation'

export default function DashboardPage() {
  redirect('/dashboard')
}
