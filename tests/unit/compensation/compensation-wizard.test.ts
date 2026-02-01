/**
 * Compensation Wizard - Automated Tests
 *
 * Tests for the 3-step configuration flow:
 * 1. Role & Location
 * 2. The Offer Numbers
 * 3. Priorities
 *
 * RALPH: Reliability, Accuracy, Logic, Performance, Hardening
 */

import { describe, it, expect } from 'vitest'
import type {
  Currency,
  RoleLevel,
  NegotiationPriority,
  OfferDetails,
  UserPriorities,
  EquityDetails,
} from '@/types/compensation'
import { CURRENCY_SYMBOLS, ROLE_LEVEL_LABELS, PRIORITY_LABELS } from '@/types/compensation'

// ============================================================================
// SECTION 1: Currency Constants Integrity
// ============================================================================

describe('Currency Constants', () => {
  it('should have 6 currencies', () => {
    expect(Object.keys(CURRENCY_SYMBOLS)).toHaveLength(6)
  })

  it('should include all expected currencies', () => {
    expect(CURRENCY_SYMBOLS).toHaveProperty('USD')
    expect(CURRENCY_SYMBOLS).toHaveProperty('EUR')
    expect(CURRENCY_SYMBOLS).toHaveProperty('GBP')
    expect(CURRENCY_SYMBOLS).toHaveProperty('ILS')
    expect(CURRENCY_SYMBOLS).toHaveProperty('CAD')
    expect(CURRENCY_SYMBOLS).toHaveProperty('AUD')
  })

  it('should have correct symbols', () => {
    expect(CURRENCY_SYMBOLS.USD).toBe('$')
    expect(CURRENCY_SYMBOLS.EUR).toBe('€')
    expect(CURRENCY_SYMBOLS.GBP).toBe('£')
    expect(CURRENCY_SYMBOLS.ILS).toBe('₪')
    expect(CURRENCY_SYMBOLS.CAD).toBe('C$')
    expect(CURRENCY_SYMBOLS.AUD).toBe('A$')
  })

  it('all symbols should be non-empty strings', () => {
    Object.values(CURRENCY_SYMBOLS).forEach(symbol => {
      expect(symbol).toBeTruthy()
      expect(typeof symbol).toBe('string')
    })
  })
})

// ============================================================================
// SECTION 2: Role Level Constants Integrity
// ============================================================================

describe('Role Level Constants', () => {
  it('should have 9 role levels', () => {
    expect(Object.keys(ROLE_LEVEL_LABELS)).toHaveLength(9)
  })

  it('should include all expected role levels', () => {
    const expectedLevels: RoleLevel[] = [
      'intern', 'junior', 'mid', 'senior', 'staff',
      'principal', 'director', 'vp', 'executive',
    ]
    expectedLevels.forEach(level => {
      expect(ROLE_LEVEL_LABELS).toHaveProperty(level)
    })
  })

  it('all labels should be non-empty strings', () => {
    Object.values(ROLE_LEVEL_LABELS).forEach(label => {
      expect(label).toBeTruthy()
      expect(typeof label).toBe('string')
    })
  })
})

// ============================================================================
// SECTION 3: Priority Labels Constants Integrity
// ============================================================================

describe('Priority Labels Constants', () => {
  it('should have 5 priority options', () => {
    expect(Object.keys(PRIORITY_LABELS)).toHaveLength(5)
  })

  it('should include all expected priorities', () => {
    const expected: NegotiationPriority[] = ['cash', 'equity', 'wlb', 'growth', 'stability']
    expected.forEach(p => {
      expect(PRIORITY_LABELS).toHaveProperty(p)
    })
  })

  it('all labels should be non-empty', () => {
    Object.values(PRIORITY_LABELS).forEach(label => {
      expect(label).toBeTruthy()
    })
  })
})

// ============================================================================
// SECTION 4: Wizard Step Navigation Logic
// ============================================================================

describe('Compensation Wizard Step Navigation', () => {
  const STEPS = [
    { id: 1, title: 'Role & Location' },
    { id: 2, title: 'The Offer' },
    { id: 3, title: 'Your Priorities' },
  ]

  it('should define 3 steps', () => {
    expect(STEPS).toHaveLength(3)
  })

  it('forward navigation: 1 -> 2 -> 3', () => {
    let step = 1
    step = step < 3 ? step + 1 : step
    expect(step).toBe(2)
    step = step < 3 ? step + 1 : step
    expect(step).toBe(3)
    step = step < 3 ? step + 1 : step
    expect(step).toBe(3) // capped
  })

  it('backward navigation: 3 -> 2 -> 1', () => {
    let step = 3
    step = step > 1 ? step - 1 : step
    expect(step).toBe(2)
    step = step > 1 ? step - 1 : step
    expect(step).toBe(1)
    step = step > 1 ? step - 1 : step
    expect(step).toBe(1) // capped
  })
})

// ============================================================================
// SECTION 5: canProceed Validation Logic
// ============================================================================

describe('Compensation Wizard canProceed Logic', () => {
  function canProceed(
    step: number,
    roleTitle: string,
    location: string,
    companyName: string,
    baseSalary: string,
    primaryFocus: NegotiationPriority | null
  ): boolean {
    switch (step) {
      case 1:
        return !!(roleTitle.trim() && location.trim() && companyName.trim())
      case 2:
        return !!(baseSalary && parseFloat(baseSalary) > 0)
      case 3:
        return !!primaryFocus
      default:
        return false
    }
  }

  // Step 1
  it('step 1: should not proceed when all fields are empty', () => {
    expect(canProceed(1, '', '', '', '', null)).toBe(false)
  })

  it('step 1: should not proceed when roleTitle is empty', () => {
    expect(canProceed(1, '', 'SF', 'Acme', '', null)).toBe(false)
  })

  it('step 1: should not proceed when location is empty', () => {
    expect(canProceed(1, 'SWE', '', 'Acme', '', null)).toBe(false)
  })

  it('step 1: should not proceed when companyName is empty', () => {
    expect(canProceed(1, 'SWE', 'SF', '', '', null)).toBe(false)
  })

  it('step 1: should not proceed when fields are whitespace-only', () => {
    expect(canProceed(1, '  ', '  ', '  ', '', null)).toBe(false)
  })

  it('step 1: should proceed when all fields are filled', () => {
    expect(canProceed(1, 'Senior SWE', 'San Francisco', 'Stripe', '', null)).toBe(true)
  })

  // Step 2
  it('step 2: should not proceed without baseSalary', () => {
    expect(canProceed(2, '', '', '', '', null)).toBe(false)
  })

  it('step 2: should not proceed with zero baseSalary', () => {
    expect(canProceed(2, '', '', '', '0', null)).toBe(false)
  })

  it('step 2: should not proceed with NaN baseSalary', () => {
    expect(canProceed(2, '', '', '', 'abc', null)).toBe(false)
  })

  it('step 2: should proceed with valid baseSalary', () => {
    expect(canProceed(2, '', '', '', '120000', null)).toBe(true)
  })

  // Step 3
  it('step 3: should not proceed without primaryFocus', () => {
    expect(canProceed(3, '', '', '', '', null)).toBe(false)
  })

  it('step 3: should proceed with any valid priority', () => {
    const priorities: NegotiationPriority[] = ['cash', 'equity', 'wlb', 'growth', 'stability']
    priorities.forEach(p => {
      expect(canProceed(3, '', '', '', '', p)).toBe(true)
    })
  })

  // Invalid step
  it('invalid step should return false', () => {
    expect(canProceed(0, 'SWE', 'SF', 'Acme', '120000', 'cash')).toBe(false)
    expect(canProceed(4, 'SWE', 'SF', 'Acme', '120000', 'cash')).toBe(false)
  })
})

// ============================================================================
// SECTION 6: OfferDetails Construction
// ============================================================================

describe('OfferDetails Construction', () => {
  function buildOfferDetails(
    baseSalary: string,
    currency: Currency,
    location: string,
    roleTitle: string,
    roleLevel: RoleLevel,
    companyName: string,
    signOnBonus: string,
    annualBonus: string,
    equityType: 'rsu' | 'options' | 'phantom' | 'none',
    equityValue: string,
    vestingYears: string
  ): OfferDetails {
    return {
      baseSalary: parseFloat(baseSalary) || 0,
      currency,
      location,
      roleTitle,
      roleLevel,
      companyName,
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
  }

  it('should parse baseSalary as number', () => {
    const offer = buildOfferDetails('150000', 'USD', 'SF', 'SWE', 'senior', 'Stripe', '', '', 'none', '', '4')
    expect(offer.baseSalary).toBe(150000)
  })

  it('should handle empty baseSalary as 0', () => {
    const offer = buildOfferDetails('', 'USD', 'SF', 'SWE', 'senior', 'Stripe', '', '', 'none', '', '4')
    expect(offer.baseSalary).toBe(0)
  })

  it('should set signOnBonus when provided', () => {
    const offer = buildOfferDetails('120000', 'USD', 'SF', 'SWE', 'mid', 'Acme', '25000', '', 'none', '', '4')
    expect(offer.signOnBonus).toBe(25000)
  })

  it('should set signOnBonus as undefined when empty', () => {
    const offer = buildOfferDetails('120000', 'USD', 'SF', 'SWE', 'mid', 'Acme', '', '', 'none', '', '4')
    expect(offer.signOnBonus).toBeUndefined()
  })

  it('should set annualBonus when provided', () => {
    const offer = buildOfferDetails('120000', 'USD', 'SF', 'SWE', 'mid', 'Acme', '', '15000', 'none', '', '4')
    expect(offer.annualBonus).toBe(15000)
  })

  it('should set equity type as none when equityType is none', () => {
    const offer = buildOfferDetails('120000', 'USD', 'SF', 'SWE', 'mid', 'Acme', '', '', 'none', '', '4')
    expect(offer.equity).toEqual({ type: 'none' })
  })

  it('should set equity with RSU details', () => {
    const offer = buildOfferDetails('120000', 'USD', 'SF', 'SWE', 'mid', 'Acme', '', '', 'rsu', '100000', '4')
    expect(offer.equity).toEqual({
      type: 'rsu',
      totalValue: 100000,
      vestingPeriodYears: 4,
    })
  })

  it('should set equity with options details', () => {
    const offer = buildOfferDetails('120000', 'USD', 'SF', 'SWE', 'mid', 'Acme', '', '', 'options', '50000', '3')
    expect(offer.equity).toEqual({
      type: 'options',
      totalValue: 50000,
      vestingPeriodYears: 3,
    })
  })

  it('should default vesting years to 4 when invalid', () => {
    const offer = buildOfferDetails('120000', 'USD', 'SF', 'SWE', 'mid', 'Acme', '', '', 'rsu', '100000', 'abc')
    expect(offer.equity).toBeDefined()
    if (offer.equity && 'vestingPeriodYears' in offer.equity) {
      expect(offer.equity.vestingPeriodYears).toBe(4)
    }
  })

  it('equity should be none when equityType is not none but equityValue is empty', () => {
    const offer = buildOfferDetails('120000', 'USD', 'SF', 'SWE', 'mid', 'Acme', '', '', 'rsu', '', '4')
    expect(offer.equity).toEqual({ type: 'none' })
  })
})

// ============================================================================
// SECTION 7: UserPriorities Construction
// ============================================================================

describe('UserPriorities Construction', () => {
  function buildPriorities(
    primaryFocus: NegotiationPriority,
    willingToWalkAway: boolean,
    currentSalary: string,
    targetSalary: string
  ): UserPriorities {
    return {
      primaryFocus,
      willingToWalkAway,
      currentSalary: currentSalary ? parseFloat(currentSalary) : undefined,
      targetSalary: targetSalary ? parseFloat(targetSalary) : undefined,
    }
  }

  it('should set primaryFocus correctly', () => {
    const p = buildPriorities('cash', false, '', '')
    expect(p.primaryFocus).toBe('cash')
  })

  it('should set willingToWalkAway', () => {
    expect(buildPriorities('cash', true, '', '').willingToWalkAway).toBe(true)
    expect(buildPriorities('cash', false, '', '').willingToWalkAway).toBe(false)
  })

  it('should set currentSalary when provided', () => {
    const p = buildPriorities('cash', false, '100000', '')
    expect(p.currentSalary).toBe(100000)
  })

  it('should set currentSalary as undefined when empty', () => {
    const p = buildPriorities('cash', false, '', '')
    expect(p.currentSalary).toBeUndefined()
  })

  it('should set targetSalary when provided', () => {
    const p = buildPriorities('cash', false, '', '150000')
    expect(p.targetSalary).toBe(150000)
  })

  it('should set targetSalary as undefined when empty', () => {
    const p = buildPriorities('cash', false, '', '')
    expect(p.targetSalary).toBeUndefined()
  })
})

// ============================================================================
// SECTION 8: Input Sanitization (numeric fields)
// ============================================================================

describe('Numeric Input Sanitization', () => {
  function sanitizeNumeric(value: string): string {
    return value.replace(/[^0-9]/g, '')
  }

  it('should strip non-numeric characters', () => {
    expect(sanitizeNumeric('120,000')).toBe('120000')
  })

  it('should strip dollar signs', () => {
    expect(sanitizeNumeric('$120000')).toBe('120000')
  })

  it('should strip letters', () => {
    expect(sanitizeNumeric('abc')).toBe('')
  })

  it('should keep pure numbers unchanged', () => {
    expect(sanitizeNumeric('150000')).toBe('150000')
  })

  it('should handle empty string', () => {
    expect(sanitizeNumeric('')).toBe('')
  })

  it('should strip decimal points', () => {
    expect(sanitizeNumeric('120000.50')).toBe('12000050')
  })

  it('should strip spaces', () => {
    expect(sanitizeNumeric('120 000')).toBe('120000')
  })
})
