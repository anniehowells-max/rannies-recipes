import { useState } from 'react'

type Props = { onLogin: () => void }

export default function Login({ onLogin }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password === import.meta.env.VITE_APP_PASSWORD) {
      sessionStorage.setItem('kitchen-auth', 'true')
      onLogin()
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-4xl font-medium mb-1">
          Rannie's <span className="italic text-green-600">Recipes</span>
        </h1>
        <p className="text-stone-400 text-sm mb-8">a shared recipe book</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false) }}
            placeholder="enter password"
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-300 focus:outline-none focus:border-green-600 transition-colors"
            autoFocus
          />
          {error && (
            <p className="text-red-400 text-sm">wrong password — try again</p>
          )}
          <button
            type="submit"
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors"
          >
            enter
          </button>
        </form>
      </div>
    </div>
  )
}
