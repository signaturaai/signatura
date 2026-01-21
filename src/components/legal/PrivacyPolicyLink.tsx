/**
 * Privacy Policy Link Component
 *
 * Consistent link to the privacy policy across the application.
 */

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

interface PrivacyPolicyLinkProps {
  className?: string
  showIcon?: boolean
  children?: React.ReactNode
}

const PRIVACY_POLICY_URL =
  'https://ablaze-quit-2b5.notion.site/Privacy-Policy-for-Signatura-ai-2cf0be2c699d80b3ab6fcccea043b664'

export default function PrivacyPolicyLink({
  className = '',
  showIcon = false,
  children,
}: PrivacyPolicyLinkProps) {
  return (
    <Link
      href={PRIVACY_POLICY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`hover:underline inline-flex items-center gap-1 ${className}`}
    >
      {children || 'Privacy Policy'}
      {showIcon && <ExternalLink className="w-3 h-3" />}
    </Link>
  )
}

export { PRIVACY_POLICY_URL }
