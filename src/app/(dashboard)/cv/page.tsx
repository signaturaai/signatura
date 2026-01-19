/**
 * CV Tailor Page
 *
 * AI-powered CV optimization with emotional support.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { FileText, Upload } from 'lucide-react'
import { Button } from '@/components/ui'

export const metadata = {
  title: 'CV Tailor | Signatura',
  description: 'Optimize your CV for specific roles with AI assistance.',
}

export default function CVPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CV Tailor</h1>
        <p className="text-muted-foreground">
          Let&apos;s work on your CV together. I&apos;ll help you show your best self.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload your base CV
          </CardTitle>
          <CardDescription>
            Start by uploading your current CV. We&apos;ll analyze it together and I&apos;ll help you discover strengths you might not see.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop your CV here, or click to browse
            </p>
            <Button variant="outline">
              Choose File
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              PDF, DOC, or DOCX up to 10MB
            </p>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-companion-muted">
            <p className="text-sm">
              <strong>What to expect:</strong> I&apos;ll analyze your CV using a 10-indicator framework,
              help you discover transferable skills you might have overlooked, and guide you through
              tailoring it for specific roles. You&apos;ve done more than you think—let&apos;s make sure
              your CV shows it.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
