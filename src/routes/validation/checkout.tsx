import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCurrentUser } from '../../lib/use-current-user'
import { checkoutParticipant } from './data'
import axios from 'axios'

export function CheckoutPage() {
  const [registrationId, setRegistrationId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  // Ref untuk mengunci ID yang sedang/sudah diproses agar tidak re-trigger loop
  const lastAttemptedId = useRef('')

  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus kembali ke input jika sedang tidak loading, sukses, atau error
  useEffect(() => {
    if (!loading && !successMessage && !error) {
      inputRef.current?.focus()
    }
  }, [loading, successMessage, error])

  // Timer 3 detik untuk reset halaman setelah SUKSES
  useEffect(() => {
    if (!successMessage) return

    const timer = setTimeout(() => {
      setSuccessMessage('')
      setRegistrationId('')
      setError('')
      lastAttemptedId.current = ''
      inputRef.current?.focus()
    }, 3000)

    return () => clearTimeout(timer)
  }, [successMessage])

  // Timer 3 detik untuk reset halaman setelah ERROR (ID Tidak Terdaftar)
  useEffect(() => {
    if (!error) return

    const timer = setTimeout(() => {
      setError('')
      setRegistrationId('')
      lastAttemptedId.current = ''
      inputRef.current?.focus()
    }, 3000)

    return () => clearTimeout(timer)
  }, [error])

  // Handler eksekusi checkout
  const processCheckout = useCallback(async (idToProcess: string) => {
    const value = idToProcess.trim()

    if (!value || loading || successMessage || error) return

    if (!currentUser) {
      navigate({ to: '/login' })
      return
    }

    // Kunci ID ini agar useEffect tidak memprosesnya lagi
    lastAttemptedId.current = value

    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      await checkoutParticipant(value, String(currentUser.id))
      setSuccessMessage('Clock out berhasil di simpan')
    } catch (err) {
      // Tampilkan notifikasi error persis format request
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError('ID anda tidak terdaftar')
      } else if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'ID anda tidak terdaftar')
      } else {
        setError('ID anda tidak terdaftar')
      }
    } finally {
      setLoading(false)
    }
  }, [loading, successMessage, error, currentUser, navigate])

  // AUTO-SUBMIT READINESS CHECK
  useEffect(() => {
    const trimmedId = registrationId.trim()
    const isValidFormat = trimmedId.length >= 5 

    // Jalankan HANYA jika ID belum pernah di-submit sebelumnya
    if (
      isValidFormat && 
      !loading && 
      !successMessage && 
      !error && 
      lastAttemptedId.current !== trimmedId
    ) {
      processCheckout(trimmedId)
    }
  }, [registrationId, loading, successMessage, error, processCheckout])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lastAttemptedId.current !== registrationId.trim()) {
      processCheckout(registrationId)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400">
            Checkout Station
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Scan ID Registrasi (Exit)
          </h1>

          <p className="mt-3 leading-7 text-slate-400">
            Scan QR code peserta yang akan keluar area event untuk mencatat log aktivitas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="checkout-registration-id"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              ID Registrasi
            </label>

            <div className="relative">
              <input
                ref={inputRef}
                id="checkout-registration-id"
                name="registrationId"
                type="text"
                value={registrationId}
                disabled={loading || !!successMessage || !!error}
                onChange={(event) => {
                  setRegistrationId(event.target.value)
                  setError('')
                }}
                placeholder="Scan QR Code Peserta..."
                autoComplete="off"
                autoFocus
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-4 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 disabled:opacity-50"
              />

              <span
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              >
                ⌁
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Sistem akan mendeteksi dan memproses ID Registrasi secara otomatis begitu ter-scan.
            </p>

            {/* Banner Sukses (Auto Clear 3 Detik) */}
            {successMessage && (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <p className="text-base font-semibold text-emerald-400">
                  {successMessage}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Halaman akan siap kembali dalam 3 detik...
                </p>
              </div>
            )}

            {/* Banner Error / ID Tidak Terdaftar (Auto Clear 3 Detik) */}
            {error && (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center">
                <p className="text-base font-semibold text-rose-400">
                  {error}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Halaman akan siap kembali dalam 3 detik...
                </p>
              </div>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}
