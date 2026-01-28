'use client'

/**
 * Contract Uploader Component
 *
 * Drag-and-drop upload zone for employment contracts.
 * Supports PDF, DOCX, PNG, and JPG files.
 */

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  CheckCircle,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  validateContractFile,
  type ContractFileType,
  type UploadState,
} from '@/types/contract'

interface ContractUploaderProps {
  onUploadComplete: (fileUrl: string, fileName: string, fileType: ContractFileType) => void
  isAnalyzing?: boolean
}

export function ContractUploader({ onUploadComplete, isAnalyzing }: ContractUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const processFile = useCallback(async (file: File) => {
    setError(null)

    // Validate file
    const validation = validateContractFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }

    setSelectedFile(file)
    setUploadState('uploading')

    try {
      // Simulate upload progress (in real implementation, this would be actual upload)
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        setUploadProgress(i)
      }

      // Create a local URL for the file (in production, this would upload to Supabase Storage)
      const fileUrl = URL.createObjectURL(file)

      setUploadState('complete')
      onUploadComplete(fileUrl, file.name, validation.fileType!)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploadState('error')
    }
  }, [onUploadComplete])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0])
      }
    },
    [processFile]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault()
      if (e.target.files && e.target.files[0]) {
        processFile(e.target.files[0])
      }
    },
    [processFile]
  )

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleReset = () => {
    setSelectedFile(null)
    setUploadState('idle')
    setError(null)
    setUploadProgress(0)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'pdf' || ext === 'docx') {
      return <FileText className="w-12 h-12 text-blue-500" />
    }
    return <ImageIcon className="w-12 h-12 text-purple-500" />
  }

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.png,.jpg,.jpeg"
        onChange={handleChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {uploadState === 'idle' && (
          <motion.div
            key="upload-zone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`
              relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
              transition-all duration-200 ease-in-out
              ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <div className="flex flex-col items-center gap-4">
              <div
                className={`
                  p-4 rounded-full transition-colors
                  ${dragActive ? 'bg-blue-100' : 'bg-gray-100'}
                `}
              >
                <Upload
                  className={`w-8 h-8 ${dragActive ? 'text-blue-500' : 'text-gray-500'}`}
                />
              </div>

              <div>
                <p className="text-lg font-medium text-gray-700">
                  {dragActive ? 'Drop your contract here' : 'Upload your contract'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  We&apos;ll find the red flags so you don&apos;t have to.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="px-2 py-1 bg-gray-100 rounded">PDF</span>
                <span className="px-2 py-1 bg-gray-100 rounded">DOCX</span>
                <span className="px-2 py-1 bg-gray-100 rounded">PNG</span>
                <span className="px-2 py-1 bg-gray-100 rounded">JPG</span>
              </div>

              <p className="text-xs text-gray-400">Max file size: 10MB</p>
            </div>
          </motion.div>
        )}

        {uploadState === 'uploading' && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="border-2 border-blue-200 rounded-2xl p-12 text-center bg-blue-50"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <div>
                <p className="text-lg font-medium text-gray-700">Uploading...</p>
                <p className="text-sm text-gray-500 mt-1">{selectedFile?.name}</p>
              </div>
              <div className="w-full max-w-xs">
                <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
              </div>
            </div>
          </motion.div>
        )}

        {uploadState === 'complete' && selectedFile && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="border-2 border-green-200 rounded-2xl p-8 bg-green-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getFileIcon(selectedFile.name)}
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAnalyzing ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Analyzing...</span>
                  </div>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReset()
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {uploadState === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="border-2 border-red-200 rounded-2xl p-8 bg-red-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <div>
                  <p className="font-medium text-red-700">Upload failed</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleReset}>
                Try again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      {error && uploadState === 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
        >
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </motion.div>
      )}
    </div>
  )
}
