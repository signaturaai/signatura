/**
 * Dashboard Skeleton - Loading State Component
 *
 * Displays a skeleton loading state while dashboard data is being fetched
 */

import { Card, CardContent, CardHeader } from '@/components/ui'
import { cn } from '@/lib/utils'

function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={cn('animate-pulse', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-8 w-16 bg-gray-300 rounded" />
          </div>
          <div className="h-12 w-12 rounded-xl bg-gray-200" />
        </div>
        <div className="h-3 w-20 bg-gray-200 rounded mt-3" />
      </CardContent>
    </Card>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-10 w-36 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard className="bg-gradient-to-br from-sky-light/30 to-sky/10" />
        <SkeletonCard className="bg-gradient-to-br from-peach-light/30 to-peach/10" />
        <SkeletonCard className="bg-gradient-to-br from-lavender-light/30 to-lavender/10" />
        <SkeletonCard className="bg-gradient-to-br from-success-light/30 to-success/10" />
        <SkeletonCard className="bg-gradient-to-br from-indigo-100/30 to-indigo-50/10" />
        <SkeletonCard className="bg-gradient-to-br from-amber-100/30 to-amber-50/10" />
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Companion Area */}
        <div className="lg:col-span-2">
          <Card className="h-[500px] animate-pulse bg-gradient-to-br from-rose-light/10 to-lavender-light/10">
            <CardHeader className="pb-3 border-b border-rose-light/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gray-200" />
                  <div className="h-5 w-32 bg-gray-200 rounded" />
                </div>
                <div className="h-8 w-24 bg-gray-200 rounded" />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="bg-white/60 rounded-2xl p-4">
                  <div className="h-4 w-full bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/60 rounded-xl p-3 h-20" />
                  <div className="bg-white/60 rounded-xl p-3 h-20" />
                  <div className="bg-white/60 rounded-xl p-3 h-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-5 w-28 bg-gray-200 rounded" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="h-24 bg-gray-100 rounded-xl" />
                <div className="h-24 bg-gray-100 rounded-xl" />
                <div className="h-24 bg-gray-100 rounded-xl" />
                <div className="h-24 bg-gray-100 rounded-xl" />
              </div>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-5 w-28 bg-gray-200 rounded" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-3 p-2">
                    <div className="h-8 w-8 rounded-lg bg-gray-200" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
                      <div className="h-3 w-24 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Table Skeleton */}
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="h-6 w-40 bg-gray-200 rounded" />
            <div className="h-8 w-24 bg-gray-200 rounded" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-b border-gray-100 p-4">
            <div className="grid grid-cols-6 gap-4">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border-b border-gray-50 p-4">
              <div className="grid grid-cols-6 gap-4 items-center">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-200" />
                  <div>
                    <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-6 w-20 bg-gray-200 rounded-full" />
                <div className="h-4 w-16 bg-gray-200 rounded" />
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-8 w-16 bg-gray-200 rounded ml-auto" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
