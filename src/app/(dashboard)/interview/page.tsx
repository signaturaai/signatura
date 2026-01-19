/**
 * Interview Coaching Page
 *
 * Practice interviews with empathetic AI feedback.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Mic, Play } from 'lucide-react'
import { Button } from '@/components/ui'

export const metadata = {
  title: 'Interview Coach | Signatura',
  description: 'Practice interviews with supportive AI feedback.',
}

export default function InterviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Interview Coach</h1>
        <p className="text-muted-foreground">
          I&apos;ll be your practice partner. Let&apos;s build your confidence together.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Behavioral Practice
            </CardTitle>
            <CardDescription>
              Practice STAR-format answers for common behavioral questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              I&apos;ll ask you questions, listen to your answers, and give you constructive feedback.
              Struggling is part of learning—that&apos;s why we practice here, where it&apos;s safe.
            </p>
            <Button variant="companion">
              <Play className="h-4 w-4 mr-2" />
              Start Practice
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Technical Practice
            </CardTitle>
            <CardDescription>
              Practice technical and system design questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              I&apos;ll simulate technical interviews tailored to your target role.
              We&apos;ll work through problems together and I&apos;ll help you articulate your thinking.
            </p>
            <Button variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Start Practice
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-companion/10 flex items-center justify-center shrink-0">
              <Mic className="h-5 w-5 text-companion" />
            </div>
            <div>
              <p className="font-medium">Remember</p>
              <p className="text-sm text-muted-foreground">
                Interviews are conversations, not interrogations. You&apos;re interviewing them too.
                Let&apos;s practice not just answering questions, but feeling confident in who you are.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
