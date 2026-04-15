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
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-xs">
        <h1 className="font-serif text-5xl font-medium tracking-tight mb-1">
          Rannie's <span className="italic text-stone-900">Recipes</span>
        </h1>
        <p className="text-stone-400 text-sm mb-10 tracking-wide">a shared recipe book</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false) }}
            placeholder="enter password"
            className="w-full py-3 border-b border-stone-200 bg-transparent text-stone-800 placeholder-stone-300 focus:outline-none focus:border-stone-500 transition-colors text-base"
            autoFocus
          />
          {error && (
            <p className="text-red-400 text-xs tracking-wide">wrong password — try again</p>
          )}
          <button
            type="submit"
            className="w-full py-3 bg-stone-900 hover:bg-black text-white text-sm font-medium tracking-wide transition-colors mt-2"
          >
            enter
          </button>
        </form>
      </div>
    </div>
  )
}
