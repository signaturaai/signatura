/**
 * Applications Page
 *
 * Track and manage job applications.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Briefcase, Plus } from 'lucide-react'
import { Button } from '@/components/ui'

export const metadata = {
  title: 'Applications | Signatura',
  description: 'Track your job applications with your AI companion.',
}

export default function ApplicationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground">
            Track your job applications. I&apos;ll help you stay organized.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            No applications yet
          </CardTitle>
          <CardDescription>
            Start tracking your job search journey. Add your first application to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            When you add applications, I&apos;ll help you:
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-companion" />
              Track status and follow-ups
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-companion" />
              Generate professional follow-up emails
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-companion" />
              Celebrate wins and support you through rejections
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
