'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, FileText, Users, TrendingUp, Calendar, ChevronRight } from 'lucide-react'

interface Profile {
  full_name: string | null
  user_type: 'candidate' | 'recruiter'
  onboarding_completed: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('full_name, user_type, onboarding_completed')
        .eq('id', user.id)
        .single()

      if (data) {
        // Type assertion for untyped table
        setProfile(data as unknown as Profile)
      }
      setLoading(false)
    }

    fetchProfile()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-orange-500" />
              <span className="text-xl font-bold text-gray-900">Signatura</span>
            </div>
            <nav className="flex items-center gap-6">
              <a href="/applications" className="text-gray-600 hover:text-gray-900">Applications</a>
              <a href="/cv" className="text-gray-600 hover:text-gray-900">CV Tailor</a>
              <a href="/interview" className="text-gray-600 hover:text-gray-900">Interview</a>
              <a href="/settings" className="text-gray-600 hover:text-gray-900">Settings</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {firstName}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here&apos;s what&apos;s happening with your job search today.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-500">Applications</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-500">Interviews</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">0%</p>
                <p className="text-sm text-gray-500">Response Rate</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-500">This Week</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/applications/new')}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <span className="font-medium text-gray-900">New Application</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => router.push('/cv')}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900">Tailor CV</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => router.push('/interview')}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-green-50 hover:border-green-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <span className="font-medium text-gray-900">Practice Interview</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-gray-500">
            <p>No recent activity yet.</p>
            <p className="text-sm mt-1">Start by creating your first job application!</p>
          </div>
        </div>
      </main>
    </div>
  )
}
