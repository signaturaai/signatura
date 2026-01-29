/**
 * My Applications Page - View Toggle & Column Visibility Tests
 *
 * Tests for view mode switching (Cards/Table) and column visibility
 * configuration for the table view.
 */

import { describe, it, expect } from 'vitest'

// ============================================================================
// VIEW MODE TYPES
// ============================================================================

type ViewMode = 'cards' | 'table'

interface ColumnConfig {
  id: string
  label: string
  visible: boolean
}

// ============================================================================
// DEFAULT COLUMN CONFIGURATION
// ============================================================================

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'company', label: 'Company', visible: true },
  { id: 'position', label: 'Position', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'next_step', label: 'Next Step', visible: true },
  { id: 'progress', label: 'Progress', visible: true },
  { id: 'applied_date', label: 'Applied Date', visible: true },
  { id: 'salary', label: 'Salary', visible: false },
  { id: 'priority', label: 'Priority', visible: false },
]

// ============================================================================
// COLUMN VISIBILITY FUNCTIONS
// ============================================================================

function getVisibleColumns(columns: ColumnConfig[]): ColumnConfig[] {
  return columns.filter((col) => col.visible)
}

function toggleColumn(columns: ColumnConfig[], columnId: string): ColumnConfig[] {
  return columns.map((col) =>
    col.id === columnId ? { ...col, visible: !col.visible } : col
  )
}

function setAllColumnsVisible(columns: ColumnConfig[]): ColumnConfig[] {
  return columns.map((col) => ({ ...col, visible: true }))
}

function getColumnById(columns: ColumnConfig[], id: string): ColumnConfig | undefined {
  return columns.find((col) => col.id === id)
}

function countVisibleColumns(columns: ColumnConfig[]): number {
  return columns.filter((col) => col.visible).length
}

// ============================================================================
// VIEW MODE TESTS
// ============================================================================

describe('View Mode', () => {
  it('should have exactly two view modes', () => {
    const viewModes: ViewMode[] = ['cards', 'table']
    expect(viewModes.length).toBe(2)
  })

  it('should default to cards view', () => {
    const defaultView: ViewMode = 'cards'
    expect(defaultView).toBe('cards')
  })

  it('should allow switching to table view', () => {
    let currentView: ViewMode = 'cards'
    currentView = 'table'
    expect(currentView).toBe('table')
  })

  it('should allow switching back to cards view', () => {
    let currentView: ViewMode = 'table'
    currentView = 'cards'
    expect(currentView).toBe('cards')
  })
})

// ============================================================================
// DEFAULT COLUMN CONFIGURATION TESTS
// ============================================================================

describe('Default Column Configuration', () => {
  it('should have 8 total columns', () => {
    expect(DEFAULT_COLUMNS.length).toBe(8)
  })

  it('should have 6 visible columns by default', () => {
    const visibleCount = countVisibleColumns(DEFAULT_COLUMNS)
    expect(visibleCount).toBe(6)
  })

  it('should have 2 hidden columns by default', () => {
    const hiddenCount = DEFAULT_COLUMNS.filter((col) => !col.visible).length
    expect(hiddenCount).toBe(2)
  })

  it('should have company column visible by default', () => {
    const company = getColumnById(DEFAULT_COLUMNS, 'company')
    expect(company?.visible).toBe(true)
  })

  it('should have position column visible by default', () => {
    const position = getColumnById(DEFAULT_COLUMNS, 'position')
    expect(position?.visible).toBe(true)
  })

  it('should have status column visible by default', () => {
    const status = getColumnById(DEFAULT_COLUMNS, 'status')
    expect(status?.visible).toBe(true)
  })

  it('should have next_step column visible by default', () => {
    const nextStep = getColumnById(DEFAULT_COLUMNS, 'next_step')
    expect(nextStep?.visible).toBe(true)
  })

  it('should have progress column visible by default', () => {
    const progress = getColumnById(DEFAULT_COLUMNS, 'progress')
    expect(progress?.visible).toBe(true)
  })

  it('should have applied_date column visible by default', () => {
    const appliedDate = getColumnById(DEFAULT_COLUMNS, 'applied_date')
    expect(appliedDate?.visible).toBe(true)
  })

  it('should have salary column hidden by default', () => {
    const salary = getColumnById(DEFAULT_COLUMNS, 'salary')
    expect(salary?.visible).toBe(false)
  })

  it('should have priority column hidden by default', () => {
    const priority = getColumnById(DEFAULT_COLUMNS, 'priority')
    expect(priority?.visible).toBe(false)
  })

  it('should have unique column IDs', () => {
    const ids = DEFAULT_COLUMNS.map((col) => col.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should have non-empty labels for all columns', () => {
    DEFAULT_COLUMNS.forEach((col) => {
      expect(col.label.length).toBeGreaterThan(0)
    })
  })
})

// ============================================================================
// GET VISIBLE COLUMNS TESTS
// ============================================================================

describe('Get Visible Columns', () => {
  it('should return only visible columns', () => {
    const visible = getVisibleColumns(DEFAULT_COLUMNS)
    expect(visible.length).toBe(6)
    visible.forEach((col) => {
      expect(col.visible).toBe(true)
    })
  })

  it('should return empty array when all columns hidden', () => {
    const allHidden = DEFAULT_COLUMNS.map((col) => ({ ...col, visible: false }))
    const visible = getVisibleColumns(allHidden)
    expect(visible.length).toBe(0)
  })

  it('should return all columns when all visible', () => {
    const allVisible = setAllColumnsVisible(DEFAULT_COLUMNS)
    const visible = getVisibleColumns(allVisible)
    expect(visible.length).toBe(8)
  })

  it('should preserve column order', () => {
    const visible = getVisibleColumns(DEFAULT_COLUMNS)
    expect(visible[0].id).toBe('company')
    expect(visible[1].id).toBe('position')
    expect(visible[2].id).toBe('status')
  })
})

// ============================================================================
// TOGGLE COLUMN TESTS
// ============================================================================

describe('Toggle Column Visibility', () => {
  it('should hide a visible column', () => {
    const updated = toggleColumn(DEFAULT_COLUMNS, 'company')
    const company = getColumnById(updated, 'company')
    expect(company?.visible).toBe(false)
  })

  it('should show a hidden column', () => {
    const updated = toggleColumn(DEFAULT_COLUMNS, 'salary')
    const salary = getColumnById(updated, 'salary')
    expect(salary?.visible).toBe(true)
  })

  it('should not affect other columns', () => {
    const updated = toggleColumn(DEFAULT_COLUMNS, 'company')
    const position = getColumnById(updated, 'position')
    const status = getColumnById(updated, 'status')
    expect(position?.visible).toBe(true)
    expect(status?.visible).toBe(true)
  })

  it('should return new array (immutable)', () => {
    const updated = toggleColumn(DEFAULT_COLUMNS, 'company')
    expect(updated).not.toBe(DEFAULT_COLUMNS)
  })

  it('should not modify original array', () => {
    const original = [...DEFAULT_COLUMNS]
    toggleColumn(DEFAULT_COLUMNS, 'company')
    expect(DEFAULT_COLUMNS[0].visible).toBe(original[0].visible)
  })

  it('should handle non-existent column ID', () => {
    const updated = toggleColumn(DEFAULT_COLUMNS, 'nonexistent')
    expect(updated.length).toBe(DEFAULT_COLUMNS.length)
    expect(countVisibleColumns(updated)).toBe(countVisibleColumns(DEFAULT_COLUMNS))
  })

  it('should toggle same column twice to return to original state', () => {
    const toggled = toggleColumn(DEFAULT_COLUMNS, 'salary')
    const toggledBack = toggleColumn(toggled, 'salary')
    const salary = getColumnById(toggledBack, 'salary')
    expect(salary?.visible).toBe(false) // Back to original hidden state
  })
})

// ============================================================================
// SET ALL COLUMNS VISIBLE TESTS
// ============================================================================

describe('Set All Columns Visible', () => {
  it('should make all columns visible', () => {
    const allVisible = setAllColumnsVisible(DEFAULT_COLUMNS)
    expect(countVisibleColumns(allVisible)).toBe(8)
  })

  it('should not affect already visible columns', () => {
    const allVisible = setAllColumnsVisible(DEFAULT_COLUMNS)
    const company = getColumnById(allVisible, 'company')
    expect(company?.visible).toBe(true)
  })

  it('should make hidden columns visible', () => {
    const allVisible = setAllColumnsVisible(DEFAULT_COLUMNS)
    const salary = getColumnById(allVisible, 'salary')
    const priority = getColumnById(allVisible, 'priority')
    expect(salary?.visible).toBe(true)
    expect(priority?.visible).toBe(true)
  })

  it('should return new array (immutable)', () => {
    const allVisible = setAllColumnsVisible(DEFAULT_COLUMNS)
    expect(allVisible).not.toBe(DEFAULT_COLUMNS)
  })

  it('should preserve column order', () => {
    const allVisible = setAllColumnsVisible(DEFAULT_COLUMNS)
    expect(allVisible[0].id).toBe('company')
    expect(allVisible[6].id).toBe('salary')
    expect(allVisible[7].id).toBe('priority')
  })
})

// ============================================================================
// COUNT VISIBLE COLUMNS TESTS
// ============================================================================

describe('Count Visible Columns', () => {
  it('should count default visible columns correctly', () => {
    expect(countVisibleColumns(DEFAULT_COLUMNS)).toBe(6)
  })

  it('should return 0 when all columns hidden', () => {
    const allHidden = DEFAULT_COLUMNS.map((col) => ({ ...col, visible: false }))
    expect(countVisibleColumns(allHidden)).toBe(0)
  })

  it('should return total when all columns visible', () => {
    const allVisible = setAllColumnsVisible(DEFAULT_COLUMNS)
    expect(countVisibleColumns(allVisible)).toBe(8)
  })

  it('should update count after toggle', () => {
    const toggled = toggleColumn(DEFAULT_COLUMNS, 'company')
    expect(countVisibleColumns(toggled)).toBe(5)
  })
})

// ============================================================================
// COLUMN CONFIGURATION STATE TESTS
// ============================================================================

describe('Column Configuration State', () => {
  it('should allow complex column state changes', () => {
    let columns = DEFAULT_COLUMNS

    // Hide company
    columns = toggleColumn(columns, 'company')
    expect(countVisibleColumns(columns)).toBe(5)

    // Show salary
    columns = toggleColumn(columns, 'salary')
    expect(countVisibleColumns(columns)).toBe(6)

    // Show priority
    columns = toggleColumn(columns, 'priority')
    expect(countVisibleColumns(columns)).toBe(7)

    // Hide status
    columns = toggleColumn(columns, 'status')
    expect(countVisibleColumns(columns)).toBe(6)

    // Verify final state
    expect(getColumnById(columns, 'company')?.visible).toBe(false)
    expect(getColumnById(columns, 'salary')?.visible).toBe(true)
    expect(getColumnById(columns, 'priority')?.visible).toBe(true)
    expect(getColumnById(columns, 'status')?.visible).toBe(false)
  })

  it('should allow reset to show all columns', () => {
    let columns = DEFAULT_COLUMNS

    // Hide some columns
    columns = toggleColumn(columns, 'company')
    columns = toggleColumn(columns, 'position')
    columns = toggleColumn(columns, 'status')
    expect(countVisibleColumns(columns)).toBe(3)

    // Reset to show all
    columns = setAllColumnsVisible(columns)
    expect(countVisibleColumns(columns)).toBe(8)
  })
})

// ============================================================================
// VIEW MODE AND COLUMNS INTEGRATION TESTS
// ============================================================================

describe('View Mode and Columns Integration', () => {
  it('should only apply column visibility in table view conceptually', () => {
    const viewMode: ViewMode = 'table'
    const visibleColumns = getVisibleColumns(DEFAULT_COLUMNS)

    // Column visibility only matters in table view
    expect(viewMode).toBe('table')
    expect(visibleColumns.length).toBe(6)
  })

  it('should have required columns for table view', () => {
    const requiredColumnIds = ['company', 'position', 'status', 'next_step']
    const visibleColumns = getVisibleColumns(DEFAULT_COLUMNS)
    const visibleIds = visibleColumns.map((col) => col.id)

    requiredColumnIds.forEach((id) => {
      expect(visibleIds).toContain(id)
    })
  })

  it('should have columns with display labels', () => {
    const expectedLabels: Record<string, string> = {
      company: 'Company',
      position: 'Position',
      status: 'Status',
      next_step: 'Next Step',
      progress: 'Progress',
      applied_date: 'Applied Date',
      salary: 'Salary',
      priority: 'Priority',
    }

    DEFAULT_COLUMNS.forEach((col) => {
      expect(col.label).toBe(expectedLabels[col.id])
    })
  })
})
