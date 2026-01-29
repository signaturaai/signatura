'use client'

/**
 * Column Visibility Dropdown
 *
 * Dropdown menu for toggling visibility of table columns.
 */

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui'
import { Columns3, Check } from 'lucide-react'
import type { ColumnConfig } from './ApplicationTableView'

interface ColumnVisibilityDropdownProps {
  columns: ColumnConfig[]
  onChange: (columns: ColumnConfig[]) => void
}

export default function ColumnVisibilityDropdown({
  columns,
  onChange,
}: ColumnVisibilityDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleColumn = (columnId: string) => {
    const updated = columns.map((col) =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    )
    onChange(updated)
  }

  const visibleCount = columns.filter((c) => c.visible).length

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
        size="sm"
      >
        <Columns3 className="w-4 h-4" />
        Columns
        <span className="ml-1 px-1.5 py-0.5 bg-gray-100 rounded text-xs text-text-secondary">
          {visibleCount}
        </span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
          <div className="px-3 py-2 border-b border-gray-100">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              Toggle Columns
            </h4>
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            {columns.map((column) => (
              <button
                key={column.id}
                onClick={() => toggleColumn(column.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors"
              >
                <span>{column.label}</span>
                {column.visible && (
                  <Check className="w-4 h-4 text-teal-600" />
                )}
              </button>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-gray-100">
            <button
              onClick={() => {
                const allVisible = columns.map((c) => ({ ...c, visible: true }))
                onChange(allVisible)
              }}
              className="text-xs text-lavender-dark hover:underline"
            >
              Show all columns
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
