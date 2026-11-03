import { useEffect, useState } from 'react'
import { fetchLaporanHarian, type LaporanHarianResponse } from '../routes/dashboard/data'

interface DailyReportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DailyReportModal({ isOpen, onClose }: DailyReportModalProps) {
  const [data, setData] = useState<LaporanHarianResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function loadReport() {
    try {
      setLoading(true)
      setError('')
      const res = await fetchLaporanHarian()
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat laporan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      void loadReport()
    }
  }, [isOpen])

  if (!isOpen) return null

  const summary = data?.summary

  // Salin ringkasan ke format chat WhatsApp
  function copyWaSummary() {
    if (!summary) return

    const nowStr = new Date().toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'short',
    })

    const text = `📊 *UPDATE LAPORAN PENGIRIMAN & KEHADIRAN EVENT*
*Peluncuran Buku: Timah, Manusia, dan Masa Depan*
📅 Waktu Update: ${nowStr} WIB

👥 *Total Database Undangan:* ${summary.total_peserta} Peserta
• 🚀 Jalur Blast Sistem: *${summary.jalur_blast ?? 0}* Tamu
• 👑 Jalur VIP Manual Klien: *${summary.jalur_manual ?? 0}* Tamu
━━━━━━━━━━━━━━━━━━━
📤 *Status Pengiriman WhatsApp:*
• Undangan Terkirim: *${summary.wa_terkirim}* (${summary.wa_persentase}%)
• Belum Terkirim: *${summary.wa_belum_terkirim}*

🎟️ *Status Konfirmasi Kehadiran (RSVP):*
• Konfirmasi Hadir: *${summary.rsvp_hadir}* Tamu
• Berhalangan Hadir: *${summary.rsvp_berhalangan}* Tamu
• Belum Menjawab: *${summary.rsvp_pending}* Tamu

🏛️ *Kehadiran di Venue (Gate Masuk):*
• Sudah Validasi Gate: *${summary.hadir_venue}* Orang
• Belum Validasi: *${summary.belum_hadir_venue}* Orang
━━━━━━━━━━━━━━━━━━━
_Laporan otomatis sistem registrasi digital_`

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl my-8 rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8 shadow-2xl text-white space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Laporan Update Real-time & Harian
              </span>
            </div>
            <h2 className="text-2xl font-bold mt-1">Laporan Pengiriman & Kehadiran</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Acara Peluncuran Buku Timah, Manusia, dan Masa Depan
              {data?.generated_at && (
                <span className="ml-2 font-mono text-cyan-300">
                  (Per {new Date(data.generated_at).toLocaleTimeString('id-ID')} WIB)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyWaSummary}
              disabled={loading || !summary}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition active:scale-95 disabled:opacity-50"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
              {copied ? '✓ Berhasil Disalin!' : 'Salin Rekap WA'}
            </button>

            <button
              type="button"
              onClick={loadReport}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 active:scale-95"
            >
              <span className={loading ? 'animate-spin' : ''}>🔄</span> Refresh
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-300">
            ⚠️ {error}
          </div>
        )}

        {loading && !data && (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent mx-auto" />
            <p className="text-xs">Menyusun data laporan realtime...</p>
          </div>
        )}

        {summary && (
          <div className="space-y-6">
            {/* Progress Bar Pengiriman WhatsApp */}
            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Progres Undangan WhatsApp Terkirim</span>
                <span className="font-bold text-emerald-400">
                  {summary.wa_terkirim} / {summary.total_peserta} ({summary.wa_persentase}%)
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, summary.wa_persentase)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{summary.wa_terkirim} undangan berhasil terkirim</span>
                <span>{summary.wa_belum_terkirim} undangan belum dikirim</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                <span className="text-[11px] text-slate-400">Pembagian Jalur Undangan:</span>
                <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
                  🚀 Jalur Blast: {summary.jalur_blast ?? 0}
                </span>
                <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-purple-300">
                  👑 VIP Manual Klien: {summary.jalur_manual ?? 0}
                </span>
              </div>
            </div>

            {/* 4 Cards Metrik Ringkasan */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">WA Terkirim</p>
                <p className="mt-2 text-3xl font-black text-white">{summary.wa_terkirim}</p>
                <p className="mt-1 text-[11px] text-slate-400">{summary.wa_persentase}% dari total</p>
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-cyan-400">RSVP Hadir</p>
                <p className="mt-2 text-3xl font-black text-white">{summary.rsvp_hadir}</p>
                <p className="mt-1 text-[11px] text-slate-400">Konfirmasi hadir</p>
              </div>

              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-rose-400">Berhalangan</p>
                <p className="mt-2 text-3xl font-black text-white">{summary.rsvp_berhalangan}</p>
                <p className="mt-1 text-[11px] text-slate-400">RSVP tidak hadir</p>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-amber-400">Validasi Gate</p>
                <p className="mt-2 text-3xl font-black text-white">{summary.hadir_venue}</p>
                <p className="mt-1 text-[11px] text-slate-400">Tiba di venue</p>
              </div>
            </div>

            {/* Breakdown Harian */}
            {data?.daily_breakdown && data.daily_breakdown.length > 0 && (
              <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  📅 Rekap Aktivitas Harian
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Undangan WA Terkirim</th>
                        <th className="py-2.5 px-3">Konfirmasi Hadir (RSVP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.daily_breakdown.map((row) => (
                        <tr key={row.tanggal} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 font-medium text-white">
                            {new Date(row.tanggal).toLocaleDateString('id-ID', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-400">
                              +{row.wa_terkirim} pesan
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 font-semibold text-cyan-300">
                              +{row.rsvp_hadir} tamu
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Log Aktivitas Terkini */}
            {data?.recent_logs && data.recent_logs.length > 0 && (
              <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  ⚡ Log Aktivitas Terbaru (Real-Time)
                </h3>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {data.recent_logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-900/60 p-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{log.participant_name || 'Peserta'}</span>
                          {log.id_registrasi && (
                            <span className="font-mono text-[10px] text-cyan-400">{log.id_registrasi}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">{log.description}</p>
                      </div>
                      <span className="whitespace-nowrap text-[11px] text-slate-500 font-mono">
                        {new Date(log.created_at).toLocaleTimeString('id-ID')} WIB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
