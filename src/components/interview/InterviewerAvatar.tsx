/**
 * InterviewerAvatar — Animated SVG avatar with visual states
 *
 * States:
 * - idle: Calm breathing animation
 * - thinking: Pulsing rings with processing indicator
 * - speaking: Wave animation simulating speech
 * - listening: Gentle glow with attention indicator
 *
 * The "Thinking" state is where the magic happens — it shows
 * the AI is cross-referencing the response with JD and Narrative.
 */
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { InterviewerVisualState } from '@/types/interview'

export interface InterviewerAvatarProps {
  state: InterviewerVisualState
  size?: number
  persona?: string
}

/** Color schemes per persona */
const PERSONA_COLORS: Record<string, { primary: string; secondary: string; accent: string }> = {
  friendly: { primary: '#f43f5e', secondary: '#fb7185', accent: '#fda4af' },
  strict: { primary: '#6366f1', secondary: '#818cf8', accent: '#a5b4fc' },
  data_driven: { primary: '#0ea5e9', secondary: '#38bdf8', accent: '#7dd3fc' },
  visionary: { primary: '#a855f7', secondary: '#c084fc', accent: '#d8b4fe' },
  default: { primary: '#f43f5e', secondary: '#fb7185', accent: '#fda4af' },
}

/** State labels displayed below the avatar */
const STATE_LABELS: Record<InterviewerVisualState, string> = {
  idle: 'Ready',
  thinking: 'Analyzing your response...',
  speaking: 'Speaking',
  listening: 'Listening',
}

export function InterviewerAvatar({ state, size = 160, persona = 'default' }: InterviewerAvatarProps) {
  const colors = PERSONA_COLORS[persona] || PERSONA_COLORS.default
  const center = size / 2
  const mainRadius = size * 0.25
  const ringRadius1 = size * 0.33
  const ringRadius2 = size * 0.40
  const ringRadius3 = size * 0.47

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
          role="img"
          aria-label={`Interviewer avatar — ${STATE_LABELS[state]}`}
        >
          <defs>
            {/* Radial gradient for the core */}
            <radialGradient id="avatar-core-gradient" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor={colors.accent} stopOpacity="0.9" />
              <stop offset="60%" stopColor={colors.primary} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.primary} stopOpacity="0.6" />
            </radialGradient>

            {/* Glow filter */}
            <filter id="avatar-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Thinking pulse filter */}
            <filter id="thinking-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer rings — animate based on state */}
          <AnimatePresence mode="wait">
            {state === 'thinking' && (
              <motion.g key="thinking-rings">
                {/* Ring 3 — outermost, slowest pulse */}
                <motion.circle
                  cx={center}
                  cy={center}
                  r={ringRadius3}
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth="1.5"
                  strokeDasharray="8 4"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: [0.2, 0.5, 0.2],
                    scale: [0.95, 1.05, 0.95],
                    rotate: [0, 360],
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    opacity: { duration: 2, repeat: Infinity },
                    scale: { duration: 2, repeat: Infinity },
                    rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
                  }}
                  style={{ transformOrigin: `${center}px ${center}px` }}
                />

                {/* Ring 2 — middle, counter-rotating */}
                <motion.circle
                  cx={center}
                  cy={center}
                  r={ringRadius2}
                  fill="none"
                  stroke={colors.secondary}
                  strokeWidth="2"
                  strokeDasharray="12 6"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0.3, 0.7, 0.3],
                    rotate: [360, 0],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    opacity: { duration: 1.5, repeat: Infinity },
                    rotate: { duration: 6, repeat: Infinity, ease: 'linear' },
                  }}
                  style={{ transformOrigin: `${center}px ${center}px` }}
                />

                {/* Ring 1 — inner, fast pulse */}
                <motion.circle
                  cx={center}
                  cy={center}
                  r={ringRadius1}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth="2.5"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0.4, 0.9, 0.4],
                    scale: [0.98, 1.02, 0.98],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                  }}
                  style={{ transformOrigin: `${center}px ${center}px` }}
                />

                {/* Scanning dots */}
                {[0, 1, 2, 3].map(i => (
                  <motion.circle
                    key={`dot-${i}`}
                    cx={center}
                    cy={center - ringRadius2}
                    r="3"
                    fill={colors.primary}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      rotate: [i * 90, i * 90 + 360],
                    }}
                    transition={{
                      opacity: { duration: 1.5, repeat: Infinity, delay: i * 0.3 },
                      rotate: { duration: 4, repeat: Infinity, ease: 'linear' },
                    }}
                    style={{ transformOrigin: `${center}px ${center}px` }}
                  />
                ))}
              </motion.g>
            )}

            {state === 'speaking' && (
              <motion.g key="speaking-waves">
                {/* Sound wave rings */}
                {[0, 1, 2].map(i => (
                  <motion.circle
                    key={`wave-${i}`}
                    cx={center}
                    cy={center}
                    r={mainRadius + 8}
                    fill="none"
                    stroke={colors.secondary}
                    strokeWidth="2"
                    initial={{ opacity: 0, scale: 1 }}
                    animate={{
                      opacity: [0.6, 0],
                      scale: [1, 1.4 + i * 0.15],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.4,
                      ease: 'easeOut',
                    }}
                    style={{ transformOrigin: `${center}px ${center}px` }}
                  />
                ))}
              </motion.g>
            )}

            {state === 'listening' && (
              <motion.g key="listening-glow">
                {/* Gentle attention ring */}
                <motion.circle
                  cx={center}
                  cy={center}
                  r={ringRadius1}
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth="2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity }}
                />

                {/* Ear indicator dots */}
                {[0, 1].map(i => (
                  <motion.circle
                    key={`ear-${i}`}
                    cx={center + (i === 0 ? -ringRadius1 - 5 : ringRadius1 + 5)}
                    cy={center}
                    r="4"
                    fill={colors.secondary}
                    animate={{
                      opacity: [0.4, 0.8, 0.4],
                      scale: [0.8, 1.2, 0.8],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                  />
                ))}
              </motion.g>
            )}

            {state === 'idle' && (
              <motion.g key="idle-ring">
                <motion.circle
                  cx={center}
                  cy={center}
                  r={ringRadius1}
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth="1.5"
                  strokeOpacity="0.3"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{ transformOrigin: `${center}px ${center}px` }}
                />
              </motion.g>
            )}
          </AnimatePresence>

          {/* Core avatar circle */}
          <motion.circle
            cx={center}
            cy={center}
            r={mainRadius}
            fill="url(#avatar-core-gradient)"
            filter={state === 'thinking' ? 'url(#thinking-glow)' : 'url(#avatar-glow)'}
            animate={
              state === 'idle'
                ? { scale: [1, 1.03, 1] }
                : state === 'thinking'
                ? { scale: [1, 1.06, 1] }
                : state === 'speaking'
                ? { scale: [1, 1.04, 0.98, 1.02, 1] }
                : { scale: 1 }
            }
            transition={{
              duration: state === 'speaking' ? 0.8 : 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: `${center}px ${center}px` }}
          />

          {/* Face — eyes and mouth */}
          <g>
            {/* Left eye */}
            <motion.ellipse
              cx={center - mainRadius * 0.3}
              cy={center - mainRadius * 0.1}
              rx={mainRadius * 0.08}
              ry={state === 'listening' ? mainRadius * 0.12 : mainRadius * 0.1}
              fill="white"
              animate={
                state === 'thinking'
                  ? { ry: [mainRadius * 0.1, mainRadius * 0.02, mainRadius * 0.1] }
                  : {}
              }
              transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Right eye */}
            <motion.ellipse
              cx={center + mainRadius * 0.3}
              cy={center - mainRadius * 0.1}
              rx={mainRadius * 0.08}
              ry={state === 'listening' ? mainRadius * 0.12 : mainRadius * 0.1}
              fill="white"
              animate={
                state === 'thinking'
                  ? { ry: [mainRadius * 0.1, mainRadius * 0.02, mainRadius * 0.1] }
                  : {}
              }
              transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Mouth */}
            <motion.path
              d={
                state === 'speaking'
                  ? `M ${center - mainRadius * 0.2} ${center + mainRadius * 0.25} Q ${center} ${center + mainRadius * 0.45} ${center + mainRadius * 0.2} ${center + mainRadius * 0.25}`
                  : `M ${center - mainRadius * 0.15} ${center + mainRadius * 0.25} Q ${center} ${center + mainRadius * 0.35} ${center + mainRadius * 0.15} ${center + mainRadius * 0.25}`
              }
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              animate={
                state === 'speaking'
                  ? {
                      d: [
                        `M ${center - mainRadius * 0.2} ${center + mainRadius * 0.25} Q ${center} ${center + mainRadius * 0.45} ${center + mainRadius * 0.2} ${center + mainRadius * 0.25}`,
                        `M ${center - mainRadius * 0.15} ${center + mainRadius * 0.25} Q ${center} ${center + mainRadius * 0.3} ${center + mainRadius * 0.15} ${center + mainRadius * 0.25}`,
                        `M ${center - mainRadius * 0.2} ${center + mainRadius * 0.25} Q ${center} ${center + mainRadius * 0.45} ${center + mainRadius * 0.2} ${center + mainRadius * 0.25}`,
                      ],
                    }
                  : {}
              }
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </g>
        </svg>
      </div>

      {/* State label */}
      <motion.div
        key={state}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <span
          className={`text-sm font-medium ${
            state === 'thinking'
              ? 'text-amber-600'
              : state === 'speaking'
              ? 'text-rose-600'
              : state === 'listening'
              ? 'text-sky-600'
              : 'text-gray-500'
          }`}
        >
          {STATE_LABELS[state]}
        </span>
      </motion.div>
    </div>
  )
}
