import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { saveCurrentUser } from '../../lib/auth-session'
import { findAccount } from './data'

export function LoginPage() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const account = await findAccount(name.trim(), password)
      saveCurrentUser(String(account.id))
      navigate({ to: '/validation' })
    } catch (requestError) {
      if (requestError instanceof Error && requestError.message === 'Network Error') {
        setError('API tidak dapat diakses. Pastikan Apache/XAMPP dan endpoint localhost aktif.')
      } else if (requestError && typeof requestError === 'object' && 'response' in requestError && requestError.response && typeof requestError.response === 'object' && 'status' in requestError.response && requestError.response.status === 404) {
        setError('Endpoint API tidak ditemukan. Periksa folder htdocs/trisakti/api/Dashboard.php.')
      } else {
        setError('Username atau password salah.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Admin portal</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Login</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Pilih akun untuk membuka ruang registrasi milikmu.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block space-y-2 text-sm font-medium">Name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="username" required className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-white/50" /></label>
          <label className="block space-y-2 text-sm font-medium">Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-white/50" /></label>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? 'Memeriksa...' : 'Masuk'}</button>
        </form>
        <p className="mt-6 border-t border-white/10 pt-5 text-xs text-slate-500">Login menggunakan akun admin dari database backend.</p>
      </section>
    </main>
  )
}