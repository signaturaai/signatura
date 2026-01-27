'use client'

/**
 * Interview Setup Wizard
 *
 * 3-step configuration flow for Interview Coach:
 * 1. Interview Type selection
 * 2. Interviewer persona (preset or LinkedIn analysis)
 * 3. Focus areas and anxieties
 */

import { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Textarea, Label } from '@/components/ui'
import {
  Users,
  Briefcase,
  Code,
  TrendingUp,
  UserPlus,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  User,
  Linkedin,
  Check,
  Target,
  Brain,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WizardConfig, FocusArea } from '@/types/interview'
import {
  INTERVIEW_TYPES as TYPES,
  PERSONA_OPTIONS as PERSONAS,
  FOCUS_AREAS as AREAS,
} from '@/types/interview'

// Icon mapping for interview types
const TypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Briefcase,
  Code,
  TrendingUp,
  UserPlus,
}

interface InterviewSetupWizardProps {
  onComplete: (config: WizardConfig) => void
  onCancel?: () => void
  initialConfig?: Partial<WizardConfig>
}

const STEPS = [
  { id: 1, title: 'Interview Type', description: 'What kind of interview?' },
  { id: 2, title: 'The Interviewer', description: 'Who will interview you?' },
  { id: 3, title: 'Focus & Strategy', description: 'What to prepare for?' },
]

export function InterviewSetupWizard({
  onComplete,
  onCancel,
  initialConfig,
}: InterviewSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [config, setConfig] = useState<Partial<WizardConfig>>({
    interviewType: initialConfig?.interviewType,
    personaMode: initialConfig?.personaMode || 'preset',
    persona: initialConfig?.persona,
    linkedInText: initialConfig?.linkedInText || '',
    interviewerName: initialConfig?.interviewerName || '',
    focusAreas: initialConfig?.focusAreas || [],
    anxieties: initialConfig?.anxieties || '',
  })

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!config.interviewType
      case 2:
        if (config.personaMode === 'preset') {
          return !!config.persona
        }
        return !!(config.linkedInText && config.linkedInText.trim().length > 50)
      case 3:
        return config.focusAreas && config.focusAreas.length > 0
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete(config as WizardConfig)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const toggleFocusArea = (area: FocusArea) => {
    const current = config.focusAreas || []
    if (current.includes(area)) {
      setConfig({ ...config, focusAreas: current.filter(a => a !== area) })
    } else {
      setConfig({ ...config, focusAreas: [...current, area] })
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  currentStep === step.id
                    ? 'bg-rose text-white'
                    : currentStep > step.id
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                )}
              >
                {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
              </div>
              <span className="text-xs mt-2 text-center text-gray-600">{step.title}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2 transition-colors',
                  currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="shadow-soft-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStep === 1 && <Target className="h-5 w-5 text-rose" />}
            {currentStep === 2 && <User className="h-5 w-5 text-rose" />}
            {currentStep === 3 && <Brain className="h-5 w-5 text-rose" />}
            {STEPS[currentStep - 1].title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {STEPS[currentStep - 1].description}
          </p>
        </CardHeader>
        <CardContent>
          {/* Step 1: Interview Type */}
          {currentStep === 1 && (
            <div className="grid gap-4">
              {TYPES.map(type => {
                const IconComponent = TypeIcons[type.icon] || Users
                return (
                  <button
                    key={type.value}
                    onClick={() => setConfig({ ...config, interviewType: type.value })}
                    className={cn(
                      'flex items-start gap-4 p-4 rounded-xl border text-left transition-all',
                      config.interviewType === type.value
                        ? 'border-rose bg-rose-light/30 shadow-soft'
                        : 'border-gray-200 hover:border-rose/50 hover:bg-gray-50'
                    )}
                  >
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        config.interviewType === type.value
                          ? 'bg-rose text-white'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-gray-500">{type.description}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {type.focusAreas.map(area => (
                          <span
                            key={area}
                            className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                    {config.interviewType === type.value && (
                      <Check className="h-5 w-5 text-rose" />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Step 2: Interviewer Persona */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Mode Selection */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setConfig({ ...config, personaMode: 'preset' })}
                  className={cn(
                    'p-4 rounded-xl border text-center transition-all',
                    config.personaMode === 'preset'
                      ? 'border-rose bg-rose-light/30'
                      : 'border-gray-200 hover:border-rose/50'
                  )}
                >
                  <User className="h-8 w-8 mx-auto mb-2 text-rose" />
                  <div className="font-medium">Preset Persona</div>
                  <div className="text-xs text-gray-500">Choose a personality type</div>
                </button>
                <button
                  onClick={() => setConfig({ ...config, personaMode: 'analyze' })}
                  className={cn(
                    'p-4 rounded-xl border text-center transition-all',
                    config.personaMode === 'analyze'
                      ? 'border-rose bg-rose-light/30'
                      : 'border-gray-200 hover:border-rose/50'
                  )}
                >
                  <Linkedin className="h-8 w-8 mx-auto mb-2 text-[#0077B5]" />
                  <div className="font-medium">Analyze Profile</div>
                  <div className="text-xs text-gray-500">Paste their LinkedIn bio</div>
                </button>
              </div>

              {/* Preset Persona Selection */}
              {config.personaMode === 'preset' && (
                <div className="grid grid-cols-2 gap-3">
                  {PERSONAS.map(persona => (
                    <button
                      key={persona.value}
                      onClick={() => setConfig({ ...config, persona: persona.value })}
                      className={cn(
                        'p-4 rounded-xl border text-left transition-all',
                        config.persona === persona.value
                          ? 'border-rose bg-rose-light/30 shadow-soft'
                          : 'border-gray-200 hover:border-rose/50'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{persona.label}</span>
                        {config.persona === persona.value && (
                          <Check className="h-4 w-4 text-rose" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{persona.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {persona.traits.map(trait => (
                          <span
                            key={trait}
                            className="text-xs px-2 py-0.5 bg-lavender-light rounded-full text-gray-600"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* LinkedIn Analysis Mode */}
              {config.personaMode === 'analyze' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          AI-Powered Interviewer Analysis
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Paste the interviewer&apos;s LinkedIn &quot;About&quot; section or bio.
                          Our AI will analyze their communication style, priorities, and likely
                          interview approach.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interviewerName">Interviewer Name (optional)</Label>
                    <input
                      id="interviewerName"
                      type="text"
                      placeholder="e.g., Sarah Chen"
                      value={config.interviewerName || ''}
                      onChange={e => setConfig({ ...config, interviewerName: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-rose focus:ring-1 focus:ring-rose outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedInText">
                      LinkedIn Bio/About Section <span className="text-rose">*</span>
                    </Label>
                    <Textarea
                      id="linkedInText"
                      placeholder="Paste the interviewer's LinkedIn 'About' section here...

Example:
'Passionate engineering leader with 15+ years building high-performance teams. I believe in data-driven decisions and empowering engineers to own their solutions. Previously at Google, Meta, and several startups...'"
                      value={config.linkedInText || ''}
                      onChange={e => setConfig({ ...config, linkedInText: e.target.value })}
                      className="min-h-[180px] resize-none"
                    />
                    <p className="text-xs text-gray-500">
                      {(config.linkedInText?.length || 0)} characters
                      {(config.linkedInText?.length || 0) < 50 && ' (minimum 50 required)'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Focus Areas & Strategy */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Focus Areas Multi-Select */}
              <div className="space-y-3">
                <Label>Focus Areas (select at least one)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AREAS.map(area => (
                    <button
                      key={area.value}
                      onClick={() => toggleFocusArea(area.value)}
                      className={cn(
                        'p-3 rounded-xl border text-left transition-all',
                        config.focusAreas?.includes(area.value)
                          ? 'border-rose bg-rose-light/30'
                          : 'border-gray-200 hover:border-rose/50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{area.label}</span>
                        {config.focusAreas?.includes(area.value) && (
                          <Check className="h-4 w-4 text-rose" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{area.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Anxieties/Custom Topics */}
              <div className="space-y-2">
                <Label htmlFor="anxieties">
                  Specific anxieties or topics to drill me on (optional)
                </Label>
                <Textarea
                  id="anxieties"
                  placeholder="e.g., 'Ask me about my gap year', 'Challenge me on my lack of experience with Kubernetes', 'I'm nervous about explaining why I left my last job'"
                  value={config.anxieties || ''}
                  onChange={e => setConfig({ ...config, anxieties: e.target.value })}
                  className="min-h-[100px] resize-none"
                />
                <p className="text-xs text-gray-500">
                  The AI will incorporate these into the interview questions to help you prepare.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div>
          {currentStep > 1 ? (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          ) : onCancel ? (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : (
            <div />
          )}
        </div>
        <Button onClick={handleNext} disabled={!canProceed()} variant="companion">
          {currentStep === 3 ? (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Interview Plan
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default InterviewSetupWizard
