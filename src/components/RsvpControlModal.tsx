import { useState, useEffect } from 'react'
import { updateRsvpSettings, type RsvpSettings } from '../routes/dashboard/data'

interface RsvpControlModalProps {
  isOpen: boolean
  onClose: () => void
  settings: RsvpSettings | null
  onUpdate: (newSettings: RsvpSettings) => void
  publicOrigin: string
  showToast: (msg: string) => void
}

export function RsvpControlModal({
  isOpen,
  onClose,
  settings,
  onUpdate,
  publicOrigin,
  showToast,
}: RsvpControlModalProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'open' | 'closed'>('open')
  const [title, setTitle] = useState('Konfirmasi Kehadiran Telah Ditutup')
  const [message, setMessage] = useState(
    'Batas waktu konfirmasi kehadiran secara online untuk acara Peluncuran Buku telah ditutup oleh panitia pelaksana. Bagi Bapak/Ibu tamu undangan yang telah melakukan konfirmasi kehadiran sebelumnya, e-Ticket dan QR Code tetap dapat diakses untuk registrasi di lokasi acara.'
  )
  const [contact, setContact] = useState('Panitia Pelaksana')

  useEffect(() => {
    if (settings) {
      setStatus(settings.status)
      if (settings.title) setTitle(settings.title)
      if (settings.message) setMessage(settings.message)
      if (settings.contact_person) setContact(settings.contact_person)
    }
  }, [settings, isOpen])

  if (!isOpen) return null

  const isClosed = status === 'closed'

  async function handleToggleStatus() {
    const nextStatus = isClosed ? 'open' : 'closed'
    const confirmMsg = isClosed
      ? 'Apakah Anda yakin ingin MEMBUKA KEMBALI link konfirmasi /landing? Tamu undangan akan bisa mengisi konfirmasi kehadiran lagi.'
      : 'Apakah Anda yakin ingin MENUTUP link konfirmasi /landing? Tamu yang belum konfirmasi tidak akan bisa mengisi formulir lagi.'

    if (!window.confirm(confirmMsg)) return

    try {
      setLoading(true)
      const updated = await updateRsvpSettings({
        rsvp_status: nextStatus,
        rsvp_closed_title: title,
        rsvp_closed_message: message,
        rsvp_contact_person: contact,
      })
      setStatus(updated.status)
      onUpdate(updated)
      showToast(
        updated.status === 'closed'
          ? '🔒 Link konfirmasi /landing BERHASIL DITUTUP'
          : '🔓 Link konfirmasi /landing BERHASIL DIBUKA KEMBALI'
      )
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status link RSVP')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveContent(e: React.FormEvent) {
    e.preventDefault()
    try {
      setLoading(true)
      const updated = await updateRsvpSettings({
        rsvp_status: status,
        rsvp_closed_title: title,
        rsvp_closed_message: message,
        rsvp_contact_person: contact,
      })
      onUpdate(updated)
      showToast('✓ Pengaturan pesan penutupan berhasil disimpan')
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pengaturan')
    } finally {
      setLoading(false)
    }
  }

  const landingTestUrl = `${publicOrigin.replace(/\/$/, '')}/landing`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700/80 bg-slate-900/95 p-6 sm:p-8 text-white shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol Tutup Modal */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header Modal */}
        <div className="space-y-1.5 pr-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            <span>Kontrol Akses Klien</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Kelola Status Link Konfirmasi (/landing)
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Fitur untuk menutup atau mengaktifkan kembali portal konfirmasi kehadiran online sesuai instruksi klien.
          </p>
        </div>

        {/* Card Status Saat Ini */}
        <div className="mt-6 rounded-2xl border p-5 transition-all shadow-inner backdrop-blur-md space-y-4 border-slate-700/60 bg-slate-950/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Status Link Saat Ini:
              </span>
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-3.5 w-3.5 rounded-full ${
                    isClosed ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 animate-pulse'
                  }`}
                />
                <span
                  className={`text-lg font-black tracking-tight ${
                    isClosed ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {isClosed ? 'DITUTUP (NONAKTIF)' : 'TERBUKA (AKTIF)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isClosed
                  ? 'Tamu baru tidak dapat mengisi form konfirmasi. Tamu yang sudah konfirmasi tetap dapat melihat e-Ticket.'
                  : 'Tamu undangan bebas membuka /landing, mencari nama, dan melakukan konfirmasi kehadiran.'}
              </p>
            </div>

            {/* Tombol Utama Toggle */}
            <button
              type="button"
              disabled={loading}
              onClick={handleToggleStatus}
              className={`shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold shadow-lg transition active:scale-95 disabled:opacity-50 ${
                isClosed
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-950/50'
              }`}
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : isClosed ? (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Buka Link Konfirmasi</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span>Tutup Link Konfirmasi</span>
                </>
              )}
            </button>
          </div>

          {/* Test URL Shortcut */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="truncate">URL: <span className="font-mono text-cyan-300">{landingTestUrl}</span></span>
            <a
              href={landingTestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300 underline shrink-0 ml-3"
            >
              Uji Coba Tampilan &rarr;
            </a>
          </div>
        </div>

        {/* Form Pengaturan Pesan Saat Ditutup */}
        <form onSubmit={handleSaveContent} className="mt-6 space-y-4 border-t border-slate-800 pt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              Pesan Tampilan Saat Link Ditutup
            </h3>
            <span className="text-[11px] text-slate-500">Muncul di halaman /landing ketika status DITUTUP</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Judul Pengumuman
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Konfirmasi Kehadiran Telah Ditutup"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Pesan / Penjelasan untuk Tamu
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Jelaskan alasan penutupan atau panduan bagi tamu..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Kontak / Penanggung Jawab Informasi
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Contoh: Panitia Pelaksana (0812-xxxx-xxxx)"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl border border-cyan-500/50 bg-cyan-500/20 px-5 py-2.5 text-xs sm:text-sm font-semibold text-cyan-300 hover:bg-cyan-500/30 transition active:scale-95 disabled:opacity-50"
            >
              Simpan Pengaturan Pesan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
