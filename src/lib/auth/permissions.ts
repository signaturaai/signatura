/**
 * Permission Utilities for RBAC
 *
 * User Types: candidate OR recruiter (mutually exclusive)
 * Admin Flag: additive (can be candidate+admin or recruiter+admin)
 */

import { createClient } from '@/lib/supabase/server'

export type UserType = 'candidate' | 'recruiter'

export interface UserPermissions {
  userId: string
  userType: UserType
  isAdmin: boolean
  canAccessCandidateFeatures: boolean
  canAccessRecruiterFeatures: boolean
  canAccessAdminPanel: boolean
}

/**
 * Get user permissions from the database
 */
export async function getUserPermissions(userId?: string): Promise<UserPermissions | null> {
  const supabase = await createClient()

  // Get current user if userId not provided
  let targetUserId = userId
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    targetUserId = user.id
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('user_type, is_admin')
    .eq('id', targetUserId)
    .single()

  if (error || !profile) {
    console.error('Error fetching user permissions:', error)
    return null
  }

  const userType = (profile.user_type as UserType) || 'candidate'
  const isAdmin = profile.is_admin || false

  return {
    userId: targetUserId,
    userType,
    isAdmin,
    canAccessCandidateFeatures: userType === 'candidate',
    canAccessRecruiterFeatures: userType === 'recruiter',
    canAccessAdminPanel: isAdmin,
  }
}

/**
 * Require specific permissions, throws if not met
 */
export async function requirePermission(
  requiredUserType?: UserType,
  requireAdmin: boolean = false
): Promise<UserPermissions> {
  const permissions = await getUserPermissions()

  if (!permissions) {
    throw new Error('Unauthorized: Not authenticated')
  }

  if (requiredUserType && permissions.userType !== requiredUserType) {
    throw new Error(`Unauthorized: Requires ${requiredUserType} account`)
  }

  if (requireAdmin && !permissions.isAdmin) {
    throw new Error('Unauthorized: Requires admin privileges')
  }

  return permissions
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(path: string, permissions: UserPermissions): boolean {
  // Candidate-only routes
  const candidateRoutes = [
    '/companion',
    '/applications',
    '/cv',
    '/cv-tailor',
    '/interview',
    '/compensation',
    '/contract',
  ]

  // Recruiter-only routes
  const recruiterRoutes = ['/jobs', '/pipeline', '/talent-pool', '/analytics', '/recruiter']

  // Admin-only routes
  const adminRoutes = ['/admin']

  // Check candidate routes
  if (candidateRoutes.some((route) => path.startsWith(route))) {
    return permissions.canAccessCandidateFeatures
  }

  // Check recruiter routes
  if (recruiterRoutes.some((route) => path.startsWith(route))) {
    return permissions.canAccessRecruiterFeatures
  }

  // Check admin routes
  if (adminRoutes.some((route) => path.startsWith(route))) {
    return permissions.canAccessAdminPanel
  }

  // Public routes (settings, etc.)
  return true
}

/**
 * Get redirect URL based on user type
 */
export function getHomeRouteForUserType(userType: UserType): string {
  switch (userType) {
    case 'candidate':
      return '/companion'
    case 'recruiter':
      return '/jobs'
    default:
      return '/'
  }
}

/**
 * Check if a route requires authentication
 */
export function isPublicRoute(path: string): boolean {
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/privacy-policy',
    '/terms',
    '/api/public',
    '/unauthorized',
  ]

  return publicRoutes.some(
    (route) => path === route || path.startsWith('/api/public') || path.startsWith('/_next')
  )
}

/**
 * Get the reason for unauthorized access
 */
export function getUnauthorizedReason(
  path: string,
  permissions: UserPermissions | null
): string | null {
  if (!permissions) {
    return 'not_authenticated'
  }

  const candidateRoutes = [
    '/companion',
    '/applications',
    '/cv',
    '/cv-tailor',
    '/interview',
    '/compensation',
    '/contract',
  ]
  const recruiterRoutes = ['/jobs', '/pipeline', '/talent-pool', '/analytics', '/recruiter']
  const adminRoutes = ['/admin']

  if (candidateRoutes.some((route) => path.startsWith(route))) {
    if (!permissions.canAccessCandidateFeatures) {
      return 'candidate_only'
    }
  }

  if (recruiterRoutes.some((route) => path.startsWith(route))) {
    if (!permissions.canAccessRecruiterFeatures) {
      return 'recruiter_only'
    }
  }

  if (adminRoutes.some((route) => path.startsWith(route))) {
    if (!permissions.canAccessAdminPanel) {
      return 'admin_only'
    }
  }

  return null
}
