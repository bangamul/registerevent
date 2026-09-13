import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
// import { saveRegistrationId } from '../../lib/registration-session'
// import { useCurrentUser } from '../../lib/use-current-user'
import { findParticipants, type Participant } from './data'

const PAGE_SIZE = 20
type SortOption = 'name' | 'latest' | 'oldest'

export function DashboardPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('name')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // const currentUser = useCurrentUser()

  const navigate = useNavigate()

  useEffect(() => {
    async function loadParticipants() {
      try {
        setLoading(true)
        setError('')

        const data = await findParticipants()

        setParticipants(data)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal mengambil data peserta',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadParticipants()
  }, [])

  const filteredParticipants = [...participants]
    .filter((participant) =>
      participant.name
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
    )
    .sort((first, second) => {
      if (sort === 'name') {
        return first.name.localeCompare(second.name)
      }

      if (!first.waktu_hadir) return 1
      if (!second.waktu_hadir) return -1

      return sort === 'latest'
        ? second.waktu_hadir.localeCompare(first.waktu_hadir)
        : first.waktu_hadir.localeCompare(second.waktu_hadir)
    })

  const totalPages = Math.max(
    1,
    Math.ceil(filteredParticipants.length / PAGE_SIZE),
  )

  const visibleParticipants = filteredParticipants.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  )

  const presentCount = participants.filter(
    (participant) => participant.status,
  ).length

  const absentCount = participants.length - presentCount

  // Fungsi Export ke Excel (Format HTML .xls)
  function exportToExcel() {
    if (participants.length === 0) {
      alert('Tidak ada data untuk diexport.')
      return
    }

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <title>Data Peserta Event</title>
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 0.5pt solid #cccccc; padding: 8px; text-align: left; font-family: Arial, sans-serif; font-size: 11pt; }
          th { background-color: #008080; color: #ffffff; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>ID Registrasi</th>
              <th>ID Independent</th>
              <th>Nama</th>
              <th>No Telepon</th>
              <th>Email</th>
              <th>Pekerjaan</th>
              <th>Gate</th>
              <th>Waktu Kehadiran</th>
              <th>Waktu Kehadiran Sesi 2</th>
              <th>Status Kehadiran</th>
            </tr>
          </thead>
          <tbody>
            ${participants
              .map(
                (p, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${p.id_registrasi || '-'}</td>
                <td>${p.id_independent || '-'}</td>
                <td>${p.name || '-'}</td>
                <td>${p.notelp ? `'${p.notelp}` : '-'}</td>
                <td>${p.email || '-'}</td>
                <td>${p.pekerjaan || '-'}</td>
                <td>${p.gate ?? '-'}</td>
                <td>${p.waktu_hadir ? new Date(p.waktu_hadir).toLocaleString('id-ID') : '-'}</td>
                <td>${p.waktu_sesi_2 ? new Date(p.waktu_sesi_2).toLocaleString('id-ID') : '-'}</td>
                <td>${p.status ? 'Hadir' : 'Belum validasi'}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    const timestamp = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `Data_Peserta_${timestamp}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function openParticipant(participant: Participant) {
    // if (currentUser) {
    //   saveRegistrationId(currentUser.id, participant.id_registrasi)
    // }

    navigate({
      to: '/dashboard/detail/$idRegistrasi',
      params: { idRegistrasi: participant.id_registrasi },
    })
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
              Overview
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Dashboard Peserta
            </h1>

            <p className="mt-2 text-slate-400">
              Pantau status registrasi dan kehadiran peserta event.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={exportToExcel}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-400 transition hover:border-emerald-500/50 hover:bg-emerald-500/20 active:scale-95"
            >
              Export Excel
            </button>

            <Link
              to="/dashboard/create"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 active:scale-95"
            >
              <svg
                className="h-5 w-5 fill-current"
                viewBox="0 0 24 24"
              >
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              Tambah Peserta
            </Link>
          </div>
        </header>

        <section
          className="grid gap-4 md:grid-cols-3"
          aria-label="Ringkasan peserta"
        >
          <SummaryCard
            label="Total database peserta"
            value={participants.length}
            tone="white"
          />

          <SummaryCard
            label="Sudah validasi"
            value={presentCount}
            tone="cyan"
          />

          <SummaryCard
            label="Belum validasi"
            value={absentCount}
            tone="amber"
          />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Daftar peserta
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Menampilkan {visibleParticipants.length} dari{' '}
                {filteredParticipants.length} peserta.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="block">
                <span className="sr-only">
                  Cari berdasarkan nama
                </span>

                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Cari nama peserta..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 sm:w-64"
                />
              </label>

              <label className="block">
                <span className="sr-only">
                  Urutkan peserta
                </span>

                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as SortOption)
                    setPage(1)
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 sm:w-52"
                >
                  <option value="name">Nama A-Z</option>
                  <option value="latest">
                    Kehadiran terbaru
                  </option>
                  <option value="oldest">
                    Kehadiran terlama
                  </option>
                </select>
              </label>
            </div>
          </div>

          {loading && (
            <div className="py-12 text-center text-slate-500">
              Memuat data peserta...
            </div>
          )}

          {!loading && error && (
            <div className="py-12 text-center text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-4">No</th>
                      <th className="px-4 py-4">Nama</th>
                      <th className="px-4 py-4">
                        Waktu kehadiran
                      </th>
                      <th className="px-4 py-4">
                        Waktu Selesai
                      </th>
                      <th className="px-4 py-4">
                        Status kehadiran
                      </th>
                      <th className="px-4 py-4 text-right">
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleParticipants.map(
                      (participant, index) => (
                        <ParticipantTableRow
                          key={participant.id}
                          participant={participant}
                          number={
                            (page - 1) * PAGE_SIZE + index + 1
                          }
                          onView={openParticipant}
                        />
                      ),
                    )}
                  </tbody>
                </table>

                {visibleParticipants.length === 0 && (
                  <p className="py-12 text-center text-slate-500">
                    Peserta tidak ditemukan.
                  </p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5 text-sm text-slate-400">
                <span>
                  Halaman {page} dari {totalPages}
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() =>
                      setPage((value) => value - 1)
                    }
                    className="rounded-lg border border-slate-700 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sebelumnya
                  </button>

                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() =>
                      setPage((value) => value + 1)
                    }
                    className="rounded-lg border border-slate-700 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'white' | 'cyan' | 'amber'
}) {
  const color =
    tone === 'cyan'
      ? 'text-cyan-300'
      : tone === 'amber'
        ? 'text-amber-300'
        : 'text-white'

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-sm text-slate-400">{label}</p>

      <p className={`mt-4 text-4xl font-bold ${color}`}>
        {value}
      </p>
    </article>
  )
}

function ParticipantTableRow({
  participant,
  number,
  onView,
}: {
  participant: Participant
  number: number
  onView: (participant: Participant) => void
}) {
  return (
    <tr className="border-b border-white/5 text-slate-300 transition hover:bg-white/[0.03]">
      <td className="px-4 py-4 text-slate-500">
        {number}
      </td>

      <td className="px-4 py-4 font-medium text-white">
        {participant.name}

        <p className="mt-1 text-xs font-normal text-slate-600">
          {participant.id_registrasi}
        </p>
      </td>

      <td className="px-4 py-4">
        {participant.waktu_hadir ? (
          <>
            {new Date(participant.waktu_hadir).toLocaleString(
              'id-ID',
              {
                dateStyle: 'medium',
                timeStyle: 'short',
              },
            )} WIB
          </>
        ) : (
          <span className="text-slate-600">-</span>
        )}
      </td>

      <td className="px-4 py-4">
        Waktu Selesai
      </td>

      <td className="px-4 py-4">
        <span
          className={
            participant.status
              ? 'rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300'
              : 'rounded-full bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300'
          }
        >
          {participant.status
            ? 'Hadir'
            : 'Belum validasi'}
        </span>
      </td>

      <td className="px-4 py-4 text-right">
        <button
          type="button"
          onClick={() => onView(participant)}
          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
        >
          Lihat
        </button>
      </td>
    </tr>
  )
}
