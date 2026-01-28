'use client'

/**
 * Negotiation Dashboard
 *
 * Displays the compensation strategy analysis including:
 * - Market Pulse badge (Heating/Cooling/Stable)
 * - Total Compensation summary
 * - Visual benchmark chart (offer vs market percentiles)
 * - Playbook tabs: Email Draft, Call Script, Objection Handling
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import { Button, Card, CardContent, CardHeader, CardTitle, Textarea } from '@/components/ui'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Mail,
  Phone,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  RefreshCw,
  ArrowLeft,
  Target,
  AlertTriangle,
  Sparkles,
  Shield,
  Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CompensationStrategy, MarketTemperature } from '@/types/compensation'
import { CURRENCY_SYMBOLS, MARKET_TEMPERATURE_CONFIG } from '@/types/compensation'

interface NegotiationDashboardProps {
  strategy: CompensationStrategy
  onRegenerate?: () => void
  onBack?: () => void
  isRegenerating?: boolean
}

type PlaybookTab = 'email' | 'phone' | 'objections'

const MARKET_POSITION_COLORS = {
  well_below_market: '#EF4444', // Red
  below_market: '#F97316', // Orange
  at_market: '#EAB308', // Yellow
  above_market: '#22C55E', // Green
  well_above_market: '#10B981', // Emerald
}

const MARKET_POSITION_LABELS = {
  well_below_market: 'Underpaid',
  below_market: 'Below Market',
  at_market: 'Fair',
  above_market: 'Above Market',
  well_above_market: 'Winning',
}

function MarketPulseBadge({ temperature }: { temperature: MarketTemperature }) {
  const config = MARKET_TEMPERATURE_CONFIG[temperature]
  const colors = {
    heating: 'bg-orange-100 text-orange-700 border-orange-200',
    stable: 'bg-blue-100 text-blue-700 border-blue-200',
    cooling: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  }
  const icons = {
    heating: TrendingUp,
    stable: Minus,
    cooling: TrendingDown,
  }
  const Icon = icons[temperature]

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium',
        colors[temperature]
      )}
    >
      <Icon className="h-4 w-4" />
      Market {config.label}
    </motion.div>
  )
}

function TCGauge({
  strategy,
  currencySymbol,
}: {
  strategy: CompensationStrategy
  currencySymbol: string
}) {
  const { analysis, marketBenchmark } = strategy
  const { totalCompensation, marketPosition, percentileEstimate } = analysis
  const { percentile25, percentile50, percentile75, percentile90 } = marketBenchmark

  // Prepare chart data
  const chartData = [
    {
      name: 'P25',
      value: percentile25,
      label: '25th Percentile',
      fill: '#E5E7EB',
    },
    {
      name: 'P50',
      value: percentile50,
      label: '50th Percentile',
      fill: '#D1D5DB',
    },
    {
      name: 'P75',
      value: percentile75,
      label: '75th Percentile',
      fill: '#9CA3AF',
    },
    {
      name: 'P90',
      value: percentile90 || Math.round(percentile75 * 1.2),
      label: '90th Percentile',
      fill: '#6B7280',
    },
  ]

  const positionColor = MARKET_POSITION_COLORS[marketPosition]
  const positionLabel = MARKET_POSITION_LABELS[marketPosition]

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${currencySymbol}${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${currencySymbol}${(value / 1000).toFixed(0)}K`
    }
    return `${currencySymbol}${value}`
  }

  return (
    <Card className="shadow-soft-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Offer vs. Market</CardTitle>
          <div
            className="px-3 py-1 rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: positionColor }}
          >
            {positionLabel}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* TC Summary */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-xl">
          <div>
            <div className="text-sm text-gray-500 mb-1">Your Total Compensation</div>
            <div className="text-3xl font-bold" style={{ color: positionColor }}>
              {currencySymbol}
              {totalCompensation.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Percentile Estimate</div>
            <div className="text-2xl font-bold text-gray-700">
              {percentileEstimate}
              <span className="text-lg">th</span>
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={formatValue}
                domain={[0, 'dataMax']}
              />
              <YAxis type="category" dataKey="name" width={40} />
              <Tooltip
                formatter={(value) => [formatValue(typeof value === 'number' ? value : 0), 'Salary']}
                labelFormatter={(label) => chartData.find(d => d.name === label)?.label || String(label)}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
              {/* Your offer line */}
              <ReferenceLine
                x={totalCompensation}
                stroke={positionColor}
                strokeWidth={3}
                strokeDasharray="5 5"
                label={{
                  value: 'Your Offer',
                  position: 'top',
                  fill: positionColor,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Market position description */}
        <div className="mt-4 p-3 rounded-lg bg-gray-50 text-sm text-gray-600">
          {analysis.marketPositionDescription}
        </div>
      </CardContent>
    </Card>
  )
}

function AnalysisSWOT({ strategy }: { strategy: CompensationStrategy }) {
  const { analysis } = strategy

  const sections = [
    {
      title: 'Strengths',
      items: analysis.strengths,
      icon: Shield,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
    },
    {
      title: 'Weaknesses',
      items: analysis.weaknesses,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    {
      title: 'Opportunities',
      items: analysis.opportunities,
      icon: Lightbulb,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
    {
      title: 'Risks',
      items: analysis.risks,
      icon: Target,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
    },
  ]

  return (
    <Card className="shadow-soft-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-rose" />
          Offer Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {sections.map(section => {
            const Icon = section.icon
            return (
              <div
                key={section.title}
                className={cn('p-4 rounded-xl border', section.bg, section.border)}
              >
                <div className={cn('flex items-center gap-2 font-semibold mb-2', section.color)}>
                  <Icon className="h-4 w-4" />
                  {section.title}
                </div>
                {section.items.length > 0 ? (
                  <ul className="space-y-1 text-sm text-gray-700">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic">None identified</p>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function StrategyOverview({ strategy }: { strategy: CompensationStrategy }) {
  const { strategy: negotiationStrategy, offerDetails } = strategy
  const currencySymbol = CURRENCY_SYMBOLS[offerDetails.currency]

  const approachColors = {
    aggressive: 'bg-red-100 text-red-700 border-red-200',
    collaborative: 'bg-blue-100 text-blue-700 border-blue-200',
    cautious: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    accept_as_is: 'bg-green-100 text-green-700 border-green-200',
  }

  const formatValue = (value: number) => `${currencySymbol}${value.toLocaleString()}`

  return (
    <Card className="shadow-soft-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recommended Strategy</CardTitle>
          <span
            className={cn(
              'px-3 py-1 rounded-full border text-sm font-medium capitalize',
              approachColors[negotiationStrategy.recommendedApproach]
            )}
          >
            {negotiationStrategy.recommendedApproach.replace('_', ' ')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rationale */}
        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
          {negotiationStrategy.approachRationale}
        </div>

        {/* Counter-offer range */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="text-xs text-red-600 font-medium mb-1">Walk Away</div>
            <div className="text-lg font-bold text-red-700">
              {formatValue(negotiationStrategy.walkAwayPoint)}
            </div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-xs text-green-600 font-medium mb-1">Target</div>
            <div className="text-lg font-bold text-green-700">
              {formatValue(negotiationStrategy.counterOfferRange.target)}
            </div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-xs text-blue-600 font-medium mb-1">Stretch</div>
            <div className="text-lg font-bold text-blue-700">
              {formatValue(negotiationStrategy.counterOfferRange.stretch)}
            </div>
          </div>
        </div>

        {/* Negotiation levers */}
        {negotiationStrategy.negotiationLevers && negotiationStrategy.negotiationLevers.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Negotiation Levers</h4>
            <div className="space-y-2">
              {negotiationStrategy.negotiationLevers.slice(0, 4).map((lever, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        lever.priority === 'primary'
                          ? 'bg-rose text-white'
                          : lever.priority === 'secondary'
                            ? 'bg-gray-300 text-gray-700'
                            : 'bg-gray-200 text-gray-600'
                      )}
                    >
                      {lever.category}
                    </span>
                    <span className="text-sm text-gray-700">{lever.description}</span>
                  </div>
                  <span
                    className={cn(
                      'text-xs',
                      lever.likelihood === 'high'
                        ? 'text-green-600'
                        : lever.likelihood === 'medium'
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    )}
                  >
                    {lever.likelihood} chance
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PlaybookTabs({ strategy }: { strategy: CompensationStrategy }) {
  const [activeTab, setActiveTab] = useState<PlaybookTab>('email')
  const [emailDraft, setEmailDraft] = useState(strategy.scripts.emailDraft)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [expandedObjection, setExpandedObjection] = useState<number | null>(null)

  const tabs: { id: PlaybookTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'email', label: 'Email Draft', icon: Mail },
    { id: 'phone', label: 'Call Script', icon: Phone },
    { id: 'objections', label: 'Objection Handling', icon: MessageSquare },
  ]

  const copyEmail = async () => {
    await navigator.clipboard.writeText(emailDraft)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  return (
    <Card className="shadow-soft-lg">
      <CardHeader>
        <CardTitle className="text-lg">The Playbook</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-rose text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Email Draft Tab */}
            {activeTab === 'email' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Customize this email and send it to your recruiter/hiring manager
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyEmail}
                    className="flex items-center gap-2"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={emailDraft}
                  onChange={e => setEmailDraft(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Your email draft will appear here..."
                />
              </div>
            )}

            {/* Call Script Tab */}
            {activeTab === 'phone' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Key talking points for your negotiation call
                </p>
                <div className="space-y-2">
                  {strategy.scripts.phoneScript.map((point, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="flex-shrink-0 w-6 h-6 bg-rose text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {i + 1}
                      </span>
                      <p className="text-sm text-gray-700">{point}</p>
                    </motion.div>
                  ))}
                </div>

                {strategy.scripts.inPersonTips && strategy.scripts.inPersonTips.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-700 mb-2">
                      In-Person Tips
                    </h4>
                    <ul className="space-y-1 text-sm text-blue-800">
                      {strategy.scripts.inPersonTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-400">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Objection Handling Tab */}
            {activeTab === 'objections' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Prepared responses for common employer objections
                </p>
                <div className="space-y-2">
                  {strategy.scripts.objectionHandling.map((objection, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpandedObjection(expandedObjection === i ? null : i)
                        }
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-left">
                          <span className="text-sm font-medium text-gray-500">
                            They say:
                          </span>
                          <span className="text-sm font-semibold text-gray-800">
                            &quot;{objection.objection}&quot;
                          </span>
                        </div>
                        {expandedObjection === i ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      <AnimatePresence>
                        {expandedObjection === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 bg-white border-t space-y-3">
                              <div>
                                <span className="text-sm font-medium text-green-600">
                                  You say:
                                </span>
                                <p className="text-sm text-gray-700 mt-1">
                                  {objection.response}
                                </p>
                              </div>
                              {objection.followUp && (
                                <div>
                                  <span className="text-sm font-medium text-blue-600">
                                    Follow up:
                                  </span>
                                  <p className="text-sm text-gray-700 mt-1">
                                    {objection.followUp}
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Closing statements */}
        {strategy.scripts.closingStatements && strategy.scripts.closingStatements.length > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-rose-light/20 to-rose-light/40 rounded-lg border border-rose/20">
            <h4 className="text-sm font-semibold text-rose mb-2">
              Closing Statements
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              {strategy.scripts.closingStatements.map((statement, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-rose mt-0.5 flex-shrink-0" />
                  {statement}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function NegotiationDashboard({
  strategy,
  onRegenerate,
  onBack,
  isRegenerating = false,
}: NegotiationDashboardProps) {
  const currencySymbol = CURRENCY_SYMBOLS[strategy.offerDetails.currency]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              New Analysis
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {strategy.offerDetails.roleTitle} @ {strategy.offerDetails.companyName}
            </h1>
            <p className="text-gray-500">{strategy.offerDetails.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MarketPulseBadge temperature={strategy.marketBenchmark.marketTemperature} />
          {onRegenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <RefreshCw className="h-4 w-4" />
                </motion.div>
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <TCGauge strategy={strategy} currencySymbol={currencySymbol} />
          <AnalysisSWOT strategy={strategy} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <StrategyOverview strategy={strategy} />
          <PlaybookTabs strategy={strategy} />
        </div>
      </div>
    </div>
  )
}

export default NegotiationDashboard
