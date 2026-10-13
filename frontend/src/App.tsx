import './App.css'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react'
import { useAuth } from '@clerk/react'
import { useEffect } from 'react'

function App() {
  const { isLoaded, isSignedIn, getToken } = useAuth()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    let cancelled = false

    void (async () => {
      try {
        const token = await getToken()
        if (!token) throw new Error('Clerk did not provide a session token')

        const response = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) {
          throw new Error(`User sync failed (${response.status}): ${await response.text()}`)
        }
      } catch (error) {
        if (!cancelled) console.error('Could not sync signed-in user with the backend:', error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, getToken])

  return (
    <>
      <header>
        <Show when="signed-out">
          <SignInButton />
          <SignUpButton />
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </header>
    </>
  )
}

export default App