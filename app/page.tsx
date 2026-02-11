'use client'
import { useAuth } from "./context/AuthContext"

export default function Home() {
  const { user, logout } = useAuth()

  return (
    <div>
      <h1>Golf League</h1>

      {user ? (
        <>
          <p>Logged in as {user.email}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>Not logged in</p>
      )}
    </div>
  )
}
