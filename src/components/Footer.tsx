/**
 * Footer Component
 *
 * Site-wide footer with legal links and contact information.
 */

import { PrivacyPolicyLink } from '@/components/legal'
import { Mail } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-gray-50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <PrivacyPolicyLink className="hover:text-gray-900" showIcon />
            <span className="text-gray-300 hidden sm:inline">|</span>
            <a
              href="mailto:hello@signatura.ai"
              className="hover:text-gray-900 flex items-center gap-1"
            >
              <Mail className="w-3 h-3" />
              Contact Us
            </a>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <a href="/settings/gdpr" className="hover:text-gray-900">
              Privacy Settings
            </a>
          </div>

          <div className="text-center sm:text-right">
            <p>&copy; {currentYear} Signatura.ai. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
