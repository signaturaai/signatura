'use client'

/**
 * Dashboard Navigation
 *
 * Main navigation for the dashboard with warm, empathetic styling.
 * Includes badges for application counts and notifications.
 */

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button, Avatar, AvatarImage, AvatarFallback } from '@/components/ui'
import {
  Heart,
  Briefcase,
  FileText,
  Mic,
  Settings,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  FileSignature,
  DollarSign,
  Search,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { useNewMatchCount } from '@/hooks/useNewMatchCount'

interface DashboardNavProps {
  user: {
    name: string
    email: string
    image?: string | null
  }
  userRole?: 'candidate' | 'recruiter' | 'admin'
}

interface NavItem {
  href: string
  label: string
  icon: typeof Heart
  description: string
  color: string
  bgColor: string
  badge?: number | string
  badgeColor?: string
  /** Roles that can see this nav item. If undefined, visible to all. */
  roles?: Array<'candidate' | 'recruiter' | 'admin'>
  /** ID for dynamic badge updates */
  id?: string
}

// Navigation items with badges
const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Overview',
    color: 'text-sky-dark',
    bgColor: 'bg-sky-light',
  },
  {
    href: '/companion',
    label: 'Companion',
    icon: Heart,
    description: 'Daily check-in',
    color: 'text-rose-dark',
    bgColor: 'bg-rose-light',
    roles: ['candidate', 'admin'],
  },
  {
    href: '/applications',
    label: 'Applications',
    icon: Briefcase,
    description: 'Track your jobs',
    color: 'text-lavender-dark',
    bgColor: 'bg-lavender-light',
    badge: 10,
    badgeColor: 'bg-lavender text-white',
    roles: ['candidate', 'admin'],
  },
  {
    id: 'job-search',
    href: '/job-search',
    label: 'Job Search',
    icon: Search,
    description: 'Find new jobs',
    color: 'text-sky-dark',
    bgColor: 'bg-sky-light',
    badgeColor: 'bg-sky text-white',
    roles: ['candidate', 'admin'],
  },
  {
    href: '/cv',
    label: 'CV Tailor',
    icon: FileText,
    description: 'Optimize your resume',
    color: 'text-peach-dark',
    bgColor: 'bg-peach-light',
    roles: ['candidate', 'admin'],
  },
  {
    href: '/interview',
    label: 'Interview',
    icon: Mic,
    description: 'Practice sessions',
    color: 'text-sky-dark',
    bgColor: 'bg-sky-light',
    badge: 3,
    badgeColor: 'bg-sky text-white',
    roles: ['candidate', 'admin'],
  },
  {
    href: '/compensation',
    label: 'Offers',
    icon: DollarSign,
    description: 'Negotiate offers',
    color: 'text-success-dark',
    bgColor: 'bg-success-light',
    badge: 1,
    badgeColor: 'bg-success text-white',
    roles: ['candidate', 'admin'],
  },
  {
    href: '/contract',
    label: 'Contract',
    icon: FileSignature,
    description: 'Review contracts',
    color: 'text-warning-dark',
    bgColor: 'bg-warning-light',
    roles: ['candidate', 'admin'],
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    description: 'Preferences',
    color: 'text-text-secondary',
    bgColor: 'bg-muted',
  },
]

export function DashboardNav({ user, userRole = 'candidate' }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Fetch new match count for Job Search badge
  const { data: newMatchCount = 0 } = useNewMatchCount({
    enabled: userRole !== 'recruiter',
    refetchInterval: 60000, // Refresh every minute
  })

  // Filter nav items based on user role and add dynamic badges
  const filteredNavItems = useMemo(() => {
    return navItems
      .filter((item) => {
        // If no roles defined, show to all
        if (!item.roles) return true
        // Otherwise, check if current role is in the allowed roles
        return item.roles.includes(userRole)
      })
      .map((item) => {
        // Add dynamic badge for Job Search
        if (item.id === 'job-search' && newMatchCount > 0) {
          return { ...item, badge: newMatchCount }
        }
        return item
      })
  }, [userRole, newMatchCount])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    // Redirect to public home page after logout
    router.push('/')
    router.refresh()
  }

  // Check if a nav item is active
  const isNavActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className="border-b border-rose-light/30 bg-white shadow-soft">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="Signatura"
              width={32}
              height={32}
              className="rounded-lg shadow-soft"
            />
            <span className="text-xl font-semibold text-text-primary">Signatura</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {filteredNavItems.map((item) => {
              const isActive = isNavActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200',
                    isActive
                      ? `${item.bgColor} ${item.color} shadow-soft`
                      : 'text-text-secondary hover:text-text-primary hover:bg-rose-light/20'
                  )}
                >
                  <item.icon className={cn('h-4 w-4', isActive && item.color)} />
                  <span className="font-medium">{item.label}</span>
                  {/* Badge */}
                  {item.badge && (
                    <span
                      className={cn(
                        'ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full min-w-[18px] text-center',
                        item.badgeColor || 'bg-rose text-white'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* User Menu (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border-2 border-rose-light shadow-soft">
                {user.image && <AvatarImage src={user.image} alt={user.name} />}
                <AvatarFallback className="bg-rose-light text-rose-dark font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm hidden xl:block">
                <p className="font-medium text-text-primary">{user.name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              title="Sign out"
              className="text-text-secondary hover:text-text-primary hover:bg-rose-light/20"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-text-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 space-y-2 animate-fade-up">
            {filteredNavItems.map((item) => {
              const isActive = isNavActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? `${item.bgColor} ${item.color} shadow-soft`
                      : 'text-text-secondary hover:text-text-primary hover:bg-rose-light/20'
                  )}
                >
                  <div className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center',
                    isActive ? 'bg-white/50' : item.bgColor
                  )}>
                    <item.icon className={cn('h-5 w-5', item.color)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text-primary">{item.label}</p>
                      {/* Mobile Badge */}
                      {item.badge && (
                        <span
                          className={cn(
                            'px-1.5 py-0.5 text-[10px] font-semibold rounded-full min-w-[18px] text-center',
                            item.badgeColor || 'bg-rose text-white'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-tertiary">
                      {item.description}
                    </p>
                  </div>
                </Link>
              )
            })}

            <div className="pt-4 mt-4 border-t border-rose-light/30">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-rose-light">
                    {user.image && <AvatarImage src={user.image} alt={user.name} />}
                    <AvatarFallback className="bg-rose-light text-rose-dark font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <p className="font-medium text-text-primary">{user.name}</p>
                    <p className="text-xs text-text-tertiary">{user.email}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-text-secondary"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
