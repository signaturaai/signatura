/**
 * Auth Layout
 *
 * Layout for authentication pages (login, signup).
 * Clean, centered design that sets a welcoming tone.
 */

import Image from 'next/image'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and tagline */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Image
              src="/logo.svg"
              alt="Signatura"
              width={64}
              height={64}
              className="rounded-xl shadow-lg"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Signatura</h1>
            <p className="text-muted-foreground">
              Your AI career companion
            </p>
          </div>
        </div>

        {/* Auth form content */}
        {children}

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          You&apos;re not alone in this journey.
        </p>
      </div>
    </div>
  )
}
