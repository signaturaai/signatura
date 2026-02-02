/**
 * useAutoSave Hook
 *
 * Debounced autosave for form data. Saves to localStorage on every change
 * with configurable debounce interval. Provides save status indicators.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseAutoSaveOptions {
  /** localStorage key to persist data under */
  key: string
  /** Debounce interval in milliseconds (default 1500) */
  debounceMs?: number
}

export function useAutoSave<T>(
  data: T,
  { key, debounceMs = 1500 }: UseAutoSaveOptions
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const isFirstRender = useRef(true)

  // Save to localStorage with debounce
  useEffect(() => {
    // Skip autosave on initial mount (we load from storage instead)
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    setSaveStatus('saving')
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data))
        setSaveStatus('saved')
        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [data, key, debounceMs])

  // Load from localStorage
  const loadSaved = useCallback((): T | null => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) return JSON.parse(stored) as T
    } catch {
      // Corrupted data — ignore
    }
    return null
  }, [key])

  // Clear saved data
  const clearSaved = useCallback(() => {
    localStorage.removeItem(key)
    setSaveStatus('idle')
  }, [key])

  return { saveStatus, loadSaved, clearSaved }
}
