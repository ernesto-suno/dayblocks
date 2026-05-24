import { useEffect } from 'react'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { loginRequest } from '../../lib/msalConfig'
import LoadingSpinner from '../shared/LoadingSpinner'
import Button from '../shared/Button'

export default function AuthWrapper({ children }) {
  const { instance, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  // Handle redirect response on page load (MSAL sends the auth code back via redirect)
  useEffect(() => {
    instance.handleRedirectPromise().catch(console.error)
  }, [instance])

  // Show spinner while MSAL is processing the redirect response
  if (inProgress !== 'none') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size={36} />
          <p className="text-[#71717a] text-sm">Signing in…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-8 text-center">
        <div className="text-5xl mb-6">🟦</div>
        <h1 className="text-3xl font-bold text-[#f4f4f5] mb-2">DayBlocks</h1>
        <p className="text-[#71717a] text-base mb-10 max-w-xs leading-relaxed">
          Your personal task scheduling and accountability tool.
        </p>
        <Button
          size="lg"
          onClick={() => instance.loginRedirect(loginRequest).catch(console.error)}
        >
          Sign in with Microsoft
        </Button>
        <p className="text-[#3f3f46] text-xs mt-6">Single-tenant · Outlook calendar access required</p>
      </div>
    )
  }

  return children
}
