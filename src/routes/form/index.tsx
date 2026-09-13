import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router' // 💡 Import useNavigate
import { useCurrentUser } from '../../lib/use-current-user'
import { useRegistrationId } from '../../lib/use-registration-id'
import {
  checkInParticipant,
  findParticipant,
  type Participant,
} from './data'

export function FormPage() {
  const navigate = useNavigate() // 💡 Inisialisasi navigate
  const currentUser = useCurrentUser()
  const registrationId = useRegistrationId(currentUser?.id)

  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('') // 💡 State feedback sukses

  // 💡 Clean up timer saat komponen unmount untuk menghindari memory leak
  useEffect(() => {
    let timerId: NodeJS.Timeout
    if (successMessage) {
      timerId = setTimeout(() => {
        navigate({ to: '/validation' })
      }, 3000)
    }
    return () => clearTimeout(timerId)
  }, [successMessage, navigate])

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!currentUser || !participant) {
      return
    }

    try {
      setSubmitting(true)
      setSubmitError('')

      const updatedParticipant = await checkInParticipant(
        participant.id_registrasi,
        currentUser.id,
      )

      setParticipant(updatedParticipant)

      const channel = new BroadcastChannel('event_checkin_channel')
      channel.postMessage({
        type: 'CHECK_IN_SUCCESS',
        participant: updatedParticipant,
      })
      channel.close()

      setSuccessMessage('Validasi berhasil! Mengalihkan ke halaman scanner dalam 3 detik...')
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Gagal memvalidasi kehadiran peserta.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!registrationId) {
      setLoading(false)
      setError('ID Registrasi tidak ditemukan.')
      return
    }

    async function loadParticipant() {
      try {
        setLoading(true)
        setError('')

        const data = await findParticipant(registrationId)

        setParticipant(data)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'Gagal mengambil data peserta.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadParticipant()
  }, [registrationId])

  if (loading) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <p className="text-sm text-slate-400">
          Mengambil data peserta...
        </p>
      </section>
    )
  }

  if (error || !participant) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-rose-500/20 bg-white/5 p-8 text-center">
          <p className="text-sm text-rose-300">
            {error || 'Data peserta tidak ditemukan.'}
          </p>

          <Link
            to="/validation"
            className="mt-5 inline-block rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950"
          >
            Kembali ke Validasi
          </Link>
        </div>
      </section>
    )
  }

  const isAlreadyValidated = Boolean(participant.waktu_hadir)

  return (
    <section className="min-h-screen bg-slate-950 px-6 py-12">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-400">
            Event Registration
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Data Peserta
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Data peserta untuk ID registrasi{' '}
            <span className="font-semibold text-slate-200">
              {participant.id_registrasi}
            </span>
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur sm:p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Scanner Fields */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* ID Registrasi */}
              <div>
                <label
                  htmlFor="registrationId"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  ID Registrasi
                </label>

                <input
                  id="registrationId"
                  name="registrationId"
                  type="text"
                  value={participant.id_registrasi}
                  readOnly
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                />
              </div>

              {/* Independent ID */}
              <div>
                <label
                  htmlFor="independentId"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Independent ID
                </label>

                <input
                  id="independentId"
                  name="independentId"
                  type="text"
                  value={participant.id_independent}
                  onChange={(e) =>
                    setParticipant({
                      ...participant,
                      id_independent: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10" />

            {/* Nama */}
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Nama
              </label>

              <input
                id="name"
                name="name"
                type="text"
                value={participant.name}
                readOnly
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
              />
            </div>

            {/* Phone + Email */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  No Telpon
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={participant.notelp}
                  readOnly
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={participant.email ?? ''}
                  readOnly
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                />
              </div>
            </div>

            {/* Pekerjaan */}
            <div>
              <label
                htmlFor="job"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Pekerjaan
              </label>

              <input
                id="job"
                name="job"
                type="text"
                value={participant.pekerjaan ?? ''}
                readOnly
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
              />
            </div>

            {/* Gate + Role Permission */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="gate"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Gate
                </label>

                <input
                  id="gate"
                  name="gate"
                  type="text"
                  value={`Gate ${participant.gate ?? '-'}`}
                  readOnly
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="role_permission"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Role Permission
                </label>

                <input
                  id="role_permission"
                  name="role_permission"
                  type="text"
                  value={`Role ${participant.role_permission ?? '-'}`}
                  readOnly
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                />
              </div>
            </div>

            {/* Status Kehadiran */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-sm font-medium text-slate-300">
                Status Kehadiran
              </p>

              <div className="mt-2 flex items-center justify-between">
                <span
                  className={
                    isAlreadyValidated
                      ? 'text-sm font-semibold text-emerald-400'
                      : 'text-sm font-semibold text-amber-400'
                  }
                >
                  {isAlreadyValidated
                    ? 'Sudah Validasi'
                    : 'Belum Validasi'}
                </span>

                {participant.waktu_hadir && (
                  <span className="text-xs text-slate-500">
                    {participant.waktu_hadir} WIB
                  </span>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              {submitError && (
                <p className="text-sm text-rose-400 mb-2">
                  {submitError}
                </p>
              )}
              {/* 💡 Alert pesan sukses & countdown */}
              {successMessage && (
                <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-xs font-medium text-emerald-400">
                  {successMessage}
                </div>
              )}
              <button
                type="submit"
                disabled={isAlreadyValidated || submitting || Boolean(successMessage)}
                className="w-full rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-white/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting
                  ? 'Memvalidasi Kehadiran...'
                  : isAlreadyValidated
                    ? 'Peserta Sudah Check-in'
                    : 'Validasi Kehadiran'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-600">
          Pastikan data peserta sudah sesuai sebelum melakukan submit.
        </p>

        <p className="mt-3 text-center text-sm text-slate-500">
          Tampilan peserta:{' '}
          <Link
            to="/profile"
            target="_blank"
            className="text-cyan-400 hover:text-cyan-300"
          >
            buka mode TV
          </Link>
        </p>
      </div>
    </section>
  )
}
