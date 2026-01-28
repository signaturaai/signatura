'use client'

/**
 * Compensation Wizard
 *
 * 3-step configuration flow for Compensation Negotiator:
 * 1. Role & Location (Job Title, City, Years of Experience)
 * 2. The Offer Numbers (Base, Currency, Equity, Signing, Bonus)
 * 3. Priorities (Cash, Long-term Upside, Work-Life Balance)
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui'
import {
  MapPin,
  DollarSign,
  Target,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Check,
  TrendingUp,
  Scale,
  Heart,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  OfferDetails,
  UserPriorities,
  Currency,
  RoleLevel,
  NegotiationPriority,
} from '@/types/compensation'
import { CURRENCY_SYMBOLS } from '@/types/compensation'

export interface WizardOutput {
  offerDetails: OfferDetails
  userPriorities: UserPriorities
}

interface CompensationWizardProps {
  onComplete: (data: WizardOutput) => void
  onCancel?: () => void
  isLoading?: boolean
}

const STEPS = [
  { id: 1, title: 'Role & Location', description: 'Tell us about the position', icon: MapPin },
  { id: 2, title: 'The Offer', description: 'Enter the compensation details', icon: DollarSign },
  { id: 3, title: 'Your Priorities', description: 'What matters most to you?', icon: Target },
]

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'GBP', label: '£ GBP' },
  { value: 'ILS', label: '₪ ILS' },
  { value: 'CAD', label: 'C$ CAD' },
  { value: 'AUD', label: 'A$ AUD' },
]

const ROLE_LEVELS: { value: RoleLevel; label: string }[] = [
  { value: 'intern', label: 'Intern' },
  { value: 'junior', label: 'Junior / Entry Level' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'staff', label: 'Staff / Lead' },
  { value: 'principal', label: 'Principal / Architect' },
  { value: 'director', label: 'Director' },
  { value: 'vp', label: 'VP / Head of' },
  { value: 'executive', label: 'C-Level / Executive' },
]

const PRIORITY_OPTIONS: {
  value: NegotiationPriority
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    value: 'cash',
    label: 'Cash Flow',
    description: 'Maximize immediate income - base salary and bonuses',
    icon: DollarSign,
  },
  {
    value: 'equity',
    label: 'Long-term Upside',
    description: 'Maximize equity and stock options for future gains',
    icon: TrendingUp,
  },
  {
    value: 'wlb',
    label: 'Work-Life Balance',
    description: 'Flexibility, remote work, PTO, and sustainable pace',
    icon: Scale,
  },
  {
    value: 'growth',
    label: 'Career Growth',
    description: 'Learning opportunities, mentorship, and advancement',
    icon: Sparkles,
  },
  {
    value: 'stability',
    label: 'Job Security',
    description: 'Stable company, benefits, and long-term employment',
    icon: Heart,
  },
]

const COMPANY_SIZES = [
  { value: 'startup', label: 'Startup (< 50)' },
  { value: 'small', label: 'Small (50-200)' },
  { value: 'medium', label: 'Medium (200-1000)' },
  { value: 'large', label: 'Large (1000-5000)' },
  { value: 'enterprise', label: 'Enterprise (5000+)' },
] as const

export function CompensationWizard({
  onComplete,
  onCancel,
  isLoading = false,
}: CompensationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1: Role & Location
  const [roleTitle, setRoleTitle] = useState('')
  const [roleLevel, setRoleLevel] = useState<RoleLevel>('mid')
  const [location, setLocation] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companySize, setCompanySize] = useState<'startup' | 'small' | 'medium' | 'large' | 'enterprise'>('medium')
  const [remotePolicy, setRemotePolicy] = useState<'onsite' | 'hybrid' | 'remote'>('hybrid')

  // Step 2: Offer Numbers
  const [baseSalary, setBaseSalary] = useState('')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [signOnBonus, setSignOnBonus] = useState('')
  const [annualBonus, setAnnualBonus] = useState('')
  const [equityType, setEquityType] = useState<'rsu' | 'options' | 'phantom' | 'none'>('none')
  const [equityValue, setEquityValue] = useState('')
  const [vestingYears, setVestingYears] = useState('4')

  // Step 3: Priorities
  const [primaryFocus, setPrimaryFocus] = useState<NegotiationPriority>('cash')
  const [willingToWalkAway, setWillingToWalkAway] = useState(false)
  const [currentSalary, setCurrentSalary] = useState('')
  const [targetSalary, setTargetSalary] = useState('')

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return roleTitle.trim() && location.trim() && companyName.trim()
      case 2:
        return baseSalary && parseFloat(baseSalary) > 0
      case 3:
        return !!primaryFocus
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    const offerDetails: OfferDetails = {
      baseSalary: parseFloat(baseSalary) || 0,
      currency,
      location,
      roleTitle,
      roleLevel,
      companyName,
      companySize,
      remotePolicy,
      signOnBonus: signOnBonus ? parseFloat(signOnBonus) : undefined,
      annualBonus: annualBonus ? parseFloat(annualBonus) : undefined,
      equity:
        equityType !== 'none' && equityValue
          ? {
              type: equityType,
              totalValue: parseFloat(equityValue),
              vestingPeriodYears: parseInt(vestingYears) || 4,
            }
          : { type: 'none' },
    }

    const userPriorities: UserPriorities = {
      primaryFocus,
      willingToWalkAway,
      currentSalary: currentSalary ? parseFloat(currentSalary) : undefined,
      targetSalary: targetSalary ? parseFloat(targetSalary) : undefined,
    }

    onComplete({ offerDetails, userPriorities })
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  }

  const [direction, setDirection] = useState(0)

  const goNext = () => {
    setDirection(1)
    handleNext()
  }

  const goBack = () => {
    setDirection(-1)
    handleBack()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{
                  scale: currentStep === step.id ? 1.1 : 1,
                  backgroundColor:
                    currentStep === step.id
                      ? '#E11D48'
                      : currentStep > step.id
                        ? '#22C55E'
                        : '#E5E7EB',
                }}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  currentStep >= step.id ? 'text-white' : 'text-gray-500'
                )}
              >
                {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
              </motion.div>
              <span className="text-xs mt-2 text-center text-gray-600">{step.title}</span>
            </div>
            {index < STEPS.length - 1 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: currentStep > step.id ? 1 : 0 }}
                className="h-0.5 flex-1 mx-2 bg-green-500 origin-left"
                style={{
                  backgroundColor: currentStep > step.id ? '#22C55E' : '#E5E7EB',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="shadow-soft-lg overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const StepIcon = STEPS[currentStep - 1].icon
              return StepIcon ? <StepIcon className="h-5 w-5 text-rose" /> : null
            })()}
            {STEPS[currentStep - 1].title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{STEPS[currentStep - 1].description}</p>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Step 1: Role & Location */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="roleTitle">Job Title *</Label>
                      <Input
                        id="roleTitle"
                        placeholder="e.g., Senior Software Engineer"
                        value={roleTitle}
                        onChange={e => setRoleTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roleLevel">Level *</Label>
                      <select
                        id="roleLevel"
                        value={roleLevel}
                        onChange={e => setRoleLevel(e.target.value as RoleLevel)}
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:border-rose focus:ring-1 focus:ring-rose outline-none bg-white"
                      >
                        {ROLE_LEVELS.map(level => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="companyName"
                          placeholder="e.g., Acme Corp"
                          value={companyName}
                          onChange={e => setCompanyName(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companySize">Company Size</Label>
                      <select
                        id="companySize"
                        value={companySize}
                        onChange={e => setCompanySize(e.target.value as typeof companySize)}
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:border-rose focus:ring-1 focus:ring-rose outline-none bg-white"
                      >
                        {COMPANY_SIZES.map(size => (
                          <option key={size.value} value={size.value}>
                            {size.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="location"
                          placeholder="e.g., San Francisco, CA"
                          value={location}
                          onChange={e => setLocation(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Work Policy</Label>
                      <div className="flex gap-2">
                        {(['onsite', 'hybrid', 'remote'] as const).map(policy => (
                          <button
                            key={policy}
                            onClick={() => setRemotePolicy(policy)}
                            className={cn(
                              'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all',
                              remotePolicy === policy
                                ? 'border-rose bg-rose-light/30 text-rose'
                                : 'border-gray-200 hover:border-rose/50'
                            )}
                          >
                            {policy.charAt(0).toUpperCase() + policy.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Offer Numbers */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  {/* Base Salary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="baseSalary">Base Salary *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="baseSalary"
                          placeholder="120,000"
                          value={baseSalary}
                          onChange={e => setBaseSalary(e.target.value.replace(/[^0-9]/g, ''))}
                          className="pl-9 text-lg font-medium"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <select
                        id="currency"
                        value={currency}
                        onChange={e => setCurrency(e.target.value as Currency)}
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:border-rose focus:ring-1 focus:ring-rose outline-none bg-white"
                      >
                        {CURRENCIES.map(curr => (
                          <option key={curr.value} value={curr.value}>
                            {curr.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bonuses */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signOnBonus">Sign-on Bonus</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          {CURRENCY_SYMBOLS[currency]}
                        </span>
                        <Input
                          id="signOnBonus"
                          placeholder="20,000"
                          value={signOnBonus}
                          onChange={e => setSignOnBonus(e.target.value.replace(/[^0-9]/g, ''))}
                          className="pl-7"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annualBonus">Annual Bonus</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          {CURRENCY_SYMBOLS[currency]}
                        </span>
                        <Input
                          id="annualBonus"
                          placeholder="15,000"
                          value={annualBonus}
                          onChange={e => setAnnualBonus(e.target.value.replace(/[^0-9]/g, ''))}
                          className="pl-7"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Equity */}
                  <div className="space-y-3">
                    <Label>Equity / Stock</Label>
                    <div className="flex gap-2">
                      {(['none', 'rsu', 'options', 'phantom'] as const).map(type => (
                        <button
                          key={type}
                          onClick={() => setEquityType(type)}
                          className={cn(
                            'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all',
                            equityType === type
                              ? 'border-rose bg-rose-light/30 text-rose'
                              : 'border-gray-200 hover:border-rose/50'
                          )}
                        >
                          {type === 'none' ? 'None' : type.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    {equityType !== 'none' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-2 gap-4 mt-3"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="equityValue">Total Value</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                              {CURRENCY_SYMBOLS[currency]}
                            </span>
                            <Input
                              id="equityValue"
                              placeholder="100,000"
                              value={equityValue}
                              onChange={e => setEquityValue(e.target.value.replace(/[^0-9]/g, ''))}
                              className="pl-7"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vestingYears">Vesting Period</Label>
                          <select
                            id="vestingYears"
                            value={vestingYears}
                            onChange={e => setVestingYears(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:border-rose focus:ring-1 focus:ring-rose outline-none bg-white"
                          >
                            <option value="3">3 years</option>
                            <option value="4">4 years</option>
                            <option value="5">5 years</option>
                          </select>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Priorities */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  {/* Primary Priority */}
                  <div className="space-y-3">
                    <Label>What&apos;s your #1 priority?</Label>
                    <div className="grid gap-3">
                      {PRIORITY_OPTIONS.map(option => {
                        const Icon = option.icon
                        return (
                          <button
                            key={option.value}
                            onClick={() => setPrimaryFocus(option.value)}
                            className={cn(
                              'flex items-center gap-4 p-4 rounded-xl border text-left transition-all',
                              primaryFocus === option.value
                                ? 'border-rose bg-rose-light/30 shadow-soft'
                                : 'border-gray-200 hover:border-rose/50 hover:bg-gray-50'
                            )}
                          >
                            <div
                              className={cn(
                                'p-2 rounded-lg',
                                primaryFocus === option.value
                                  ? 'bg-rose text-white'
                                  : 'bg-gray-100 text-gray-600'
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{option.label}</div>
                              <div className="text-sm text-gray-500">{option.description}</div>
                            </div>
                            {primaryFocus === option.value && (
                              <Check className="h-5 w-5 text-rose" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Current & Target Salary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentSalary">Current Salary (optional)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          {CURRENCY_SYMBOLS[currency]}
                        </span>
                        <Input
                          id="currentSalary"
                          placeholder="100,000"
                          value={currentSalary}
                          onChange={e => setCurrentSalary(e.target.value.replace(/[^0-9]/g, ''))}
                          className="pl-7"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetSalary">Target Salary (optional)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          {CURRENCY_SYMBOLS[currency]}
                        </span>
                        <Input
                          id="targetSalary"
                          placeholder="150,000"
                          value={targetSalary}
                          onChange={e => setTargetSalary(e.target.value.replace(/[^0-9]/g, ''))}
                          className="pl-7"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Walk Away Toggle */}
                  <button
                    onClick={() => setWillingToWalkAway(!willingToWalkAway)}
                    className={cn(
                      'w-full flex items-center justify-between p-4 rounded-xl border transition-all',
                      willingToWalkAway
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="text-left">
                      <div className="font-medium">Willing to Walk Away</div>
                      <div className="text-sm text-gray-500">
                        I have other options or can wait for a better offer
                      </div>
                    </div>
                    <div
                      className={cn(
                        'w-12 h-7 rounded-full transition-colors relative',
                        willingToWalkAway ? 'bg-green-500' : 'bg-gray-300'
                      )}
                    >
                      <motion.div
                        initial={false}
                        animate={{ x: willingToWalkAway ? 22 : 2 }}
                        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm"
                      />
                    </div>
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div>
          {currentStep > 1 ? (
            <Button variant="outline" onClick={goBack} disabled={isLoading}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          ) : onCancel ? (
            <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          ) : (
            <div />
          )}
        </div>
        <Button onClick={goNext} disabled={!canProceed() || isLoading} variant="companion">
          {isLoading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"
              />
              Analyzing...
            </>
          ) : currentStep === 3 ? (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Analyze Offer
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

export default CompensationWizard
