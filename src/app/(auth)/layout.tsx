/**
 * Auth Layout
 *
 * Layout for authentication pages (login, signup).
 * Clean, centered design that sets a welcoming tone.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and tagline */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Signatura</h1>
          <p className="text-muted-foreground">
            Your AI career companion
          </p>
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
