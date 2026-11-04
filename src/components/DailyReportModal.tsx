import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
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

  // 1. FORMAT PESAN WHATSAPP RESMI & PROTOKOLER
  function copyWaSummary() {
    if (!summary) return

    const nowStr = new Date().toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'short',
    })

    const rsvpPercent =
      summary.total_peserta > 0
        ? ((summary.rsvp_hadir / summary.total_peserta) * 100).toFixed(1)
        : '0'

    const text = `*LAPORAN PERKEMBANGAN DISTRIBUSI UNDANGAN & KONFIRMASI KEHADIRAN (RSVP)*
*Peluncuran Buku: Timah, Manusia, dan Masa Depan*

Kepada Yth.
*Bapak/Ibu Pimpinan & Panitia Penyelenggara*
di Tempat

Dengan hormat,
Bersama ini kami sampaikan laporan mutakhir rekapitulasi pengiriman undangan digital dan konfirmasi kehadiran tamu undangan per *${nowStr} WIB*:

I. STATUS DISTRIBUSI UNDANGAN
• Total Basis Data Undangan : *${summary.total_peserta} Tamu*
  - Jalur Blast Sistem      : ${summary.jalur_blast ?? 0} Tamu
  - Jalur VIP Manual Klien  : ${summary.jalur_manual ?? 0} Tamu
• Undangan Berhasil Terkirim: *${summary.wa_terkirim} Tamu (${summary.wa_persentase}%)*
• Undangan Menunggu Kirim   : *${summary.wa_belum_terkirim} Tamu*

II. REKAPITULASI KONFIRMASI KEHADIRAN (RSVP)
• Konfirmasi Hadir (E-Ticket Terbit) : *${summary.rsvp_hadir} Tamu (${rsvpPercent}%)*
• Konfirmasi Berhalangan Hadir       : *${summary.rsvp_berhalangan} Tamu*
• Belum Memberikan Konfirmasi        : *${summary.rsvp_pending} Tamu*

III. VALIDASI KEHADIRAN DI LOKASI (VENUE CHECK-IN)
• Telah Hadir (Scan Pintu Gate)      : *${summary.hadir_venue} Tamu*
• Belum Tiba di Lokasi               : *${summary.belum_hadir_venue} Tamu*

IV. DISTRIBUSI SOUVENIR ACARA
• Souvenir Terdistribusi             : *${summary.souvenir_diambil ?? 0} Tamu*
• Sisa Belum Diambil                 : *${summary.souvenir_belum_diambil ?? (summary.total_peserta - (summary.souvenir_diambil ?? 0))} Tamu*

V. INFORMASI PELAKSANAAN ACARA
📅 Hari/Tanggal : Senin, 9 November 2026
⏰ Waktu Acara  : Pukul 15.00 - 19.00 WIB
📍 Tempat Acara : Sumba Room, Hotel Borobudur Jakarta

Demikian laporan perkembangan resmi ini kami sampaikan sebagai bahan evaluasi dan koordinasi bersama. Pembaruan data akan terus kami laporkan secara berkala.

Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.

Hormat kami,
*Sekretariat & Tim Registrasi Acara*
_Sistem Registrasi Digital & E-Ticketing_`

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }

  // 2. EKSPOR DOKUMEN LAPORAN FORMAL (CETAK / SIMPAN PDF BER-KOP SURAT)
  function exportFormalPdf() {
    if (!summary || !data) return

    const nowStr = new Date().toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'short',
    })
    const dateOnly = new Date().toLocaleDateString('id-ID', {
      dateStyle: 'full',
    })

    const rsvpPercent =
      summary.total_peserta > 0
        ? ((summary.rsvp_hadir / summary.total_peserta) * 100).toFixed(1)
        : '0'

    const printWindow = window.open('', '_blank', 'width=950,height=800')
    if (!printWindow) {
      alert('Harap izinkan popup browser untuk mencetak atau menyimpan PDF laporan resmi.')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Laporan Eksekutif - Peluncuran Buku Timah</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; color: #111; margin: 25px 35px; font-size: 11pt; line-height: 1.45; }
          .kop { text-align: center; border-bottom: 3px double #111; padding-bottom: 12px; margin-bottom: 20px; }
          .kop h1 { margin: 0; font-size: 15pt; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold; }
          .kop h2 { margin: 4px 0; font-size: 13pt; font-weight: normal; font-style: italic; }
          .kop p { margin: 2px 0; font-size: 10pt; color: #444; }
          .title { text-align: center; font-size: 12pt; font-weight: bold; text-decoration: underline; text-transform: uppercase; margin-bottom: 4px; }
          .meta { text-align: center; font-size: 9.5pt; color: #555; margin-bottom: 22px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 10pt; }
          th, td { border: 1px solid #333; padding: 6px 10px; }
          th { background-color: #f2f2f2; font-weight: bold; text-align: left; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .section-header { font-size: 11pt; font-weight: bold; margin: 16px 0 6px 0; border-bottom: 1px solid #bbb; padding-bottom: 4px; }
          .signature-box { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
          .sig-col { width: 220px; text-align: center; }
          .sig-space { height: 70px; }
          @media print {
            body { margin: 15mm 20mm; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="kop">
          <h1>PANITIA PENYELENGGARA PELUNCURAN BUKU</h1>
          <h2>"TIMAH, MANUSIA, DAN MASA DEPAN"</h2>
          <p>Sekretariat Pelaksana • Hotel Borobudur Jakarta • Senin, 9 November 2026</p>
        </div>

        <div class="title">LAPORAN EKSEKUTIF REAL-TIME DISTRIBUSI UNDANGAN & RSVP</div>
        <div class="meta">Waktu Pembaruan Data: ${nowStr} WIB</div>

        <div class="section-header">I. RINGKASAN DATA STATISTIK UTAMA</div>
        <table>
          <thead>
            <tr>
              <th>Indikator Parameter</th>
              <th class="text-right">Jumlah</th>
              <th class="text-right">Persentase</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Total Basis Data Undangan</b></td>
              <td class="text-right"><b>${summary.total_peserta}</b></td>
              <td class="text-right">100%</td>
              <td>Database tamu resmi yang terdaftar</td>
            </tr>
            <tr>
              <td>• Jalur Blast Sistem (WhatsApp Otomatis)</td>
              <td class="text-right">${summary.jalur_blast ?? 0}</td>
              <td class="text-right">${summary.total_peserta > 0 ? (((summary.jalur_blast ?? 0) / summary.total_peserta) * 100).toFixed(1) : 0}%</td>
              <td>Dikelola panitia sistem blast</td>
            </tr>
            <tr>
              <td>• Jalur VIP Manual Klien (Personal)</td>
              <td class="text-right">${summary.jalur_manual ?? 0}</td>
              <td class="text-right">${summary.total_peserta > 0 ? (((summary.jalur_manual ?? 0) / summary.total_peserta) * 100).toFixed(1) : 0}%</td>
              <td>Didistribusikan langsung oleh tim klien</td>
            </tr>
            <tr>
              <td><b>Undangan Berhasil Terkirim (WA)</b></td>
              <td class="text-right"><b>${summary.wa_terkirim}</b></td>
              <td class="text-right"><b>${summary.wa_persentase}%</b></td>
              <td>Undangan diterima di nomor WhatsApp tamu</td>
            </tr>
            <tr>
              <td>Undangan Belum Terkirim</td>
              <td class="text-right">${summary.wa_belum_terkirim}</td>
              <td class="text-right">${(100 - summary.wa_persentase).toFixed(1)}%</td>
              <td>Menunggu giliran pengiriman</td>
            </tr>
            <tr style="background-color: #fafafa;">
              <td><b>Konfirmasi Kehadiran Hadir (RSVP)</b></td>
              <td class="text-right"><b>${summary.rsvp_hadir}</b></td>
              <td class="text-right"><b>${rsvpPercent}%</b></td>
              <td><b>E-Ticket QR Code resmi telah diterbitkan</b></td>
            </tr>
            <tr>
              <td>Konfirmasi Berhalangan Hadir</td>
              <td class="text-right">${summary.rsvp_berhalangan}</td>
              <td class="text-right">${summary.total_peserta > 0 ? ((summary.rsvp_berhalangan / summary.total_peserta) * 100).toFixed(1) : 0}%</td>
              <td>Telah menyatakan tidak dapat hadir</td>
            </tr>
            <tr>
              <td>Menunggu Jawaban RSVP</td>
              <td class="text-right">${summary.rsvp_pending}</td>
              <td class="text-right">${summary.total_peserta > 0 ? ((summary.rsvp_pending / summary.total_peserta) * 100).toFixed(1) : 0}%</td>
              <td>Belum mengisi form konfirmasi</td>
            </tr>
            <tr>
              <td>Validasi Check-in di Venue (Pintu Gate)</td>
              <td class="text-right">${summary.hadir_venue}</td>
              <td class="text-right">${summary.total_peserta > 0 ? ((summary.hadir_venue / summary.total_peserta) * 100).toFixed(1) : 0}%</td>
              <td>Scan barcode QR di pintu masuk acara</td>
            </tr>
            <tr style="background-color: #f5f3ff;">
              <td><b>Souvenir Terdistribusi</b></td>
              <td class="text-right"><b>${summary.souvenir_diambil ?? 0}</b></td>
              <td class="text-right"><b>${summary.total_peserta > 0 ? (((summary.souvenir_diambil ?? 0) / summary.total_peserta) * 100).toFixed(1) : 0}%</b></td>
              <td><b>Paket souvenir telah diambil tamu di meja souvenir</b></td>
            </tr>
          </tbody>
        </table>

        ${
          data.daily_breakdown && data.daily_breakdown.length > 0
            ? `
          <div class="section-header">II. REKAPITULASI PROGRES PENGIRIMAN & RSVP HARIAN</div>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th class="text-right">Undangan WA Terkirim</th>
                <th class="text-right">Konfirmasi Hadir (RSVP)</th>
              </tr>
            </thead>
            <tbody>
              ${data.daily_breakdown
                .map(
                  (row) => `
                <tr>
                  <td>${new Date(row.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                  <td class="text-right">+${row.wa_terkirim} pesan</td>
                  <td class="text-right">+${row.rsvp_hadir} tamu</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        `
            : ''
        }

        <div class="section-header">III. DETAIL WAKTU & LOKASI ACARA</div>
        <table>
          <tr>
            <td style="width: 25%;"><b>Nama Acara</b></td>
            <td>Peluncuran Buku "Timah, Manusia, dan Masa Depan"</td>
          </tr>
          <tr>
            <td><b>Hari & Tanggal</b></td>
            <td>Senin, 9 November 2026</td>
          </tr>
          <tr>
            <td><b>Waktu Acara</b></td>
            <td>15.00 - 19.00 WIB</td>
          </tr>
          <tr>
            <td><b>Lokasi Acara</b></td>
            <td>Sumba Room, Hotel Borobudur Jakarta</td>
          </tr>
        </table>

        <div class="signature-box">
          <div class="sig-col">
            <p>Disiapkan Oleh,<br><b>Tim Registrasi & IT Event</b></p>
            <div class="sig-space"></div>
            <p>( Koordinator Registrasi )</p>
          </div>
          <div class="sig-col">
            <p>Jakarta, ${dateOnly}<br>Mengetahui,<br><b>Ketua Panitia Pelaksana</b></p>
            <div class="sig-space"></div>
            <p>( .................................................... )</p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 24px; font-size: 11pt; background: #0b3d3d; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
            🖨️ Cetak / Simpan sebagai PDF
          </button>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  // 3. EKSPOR LAPORAN RESMI KE EXCEL (.XLSX)
  function exportReportExcel() {
    if (!summary || !data) return

    const nowStr = new Date().toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'short',
    })

    // Sheet 1: Ringkasan Eksekutif
    const wsSummaryData: (string | number)[][] = [
      ['LAPORAN EKSEKUTIF REAL-TIME DISTRIBUSI UNDANGAN & RSVP'],
      ['Acara: Peluncuran Buku Timah, Manusia, dan Masa Depan'],
      [`Waktu Pembaruan: ${nowStr} WIB`],
      [''],
      ['Indikator Parameter', 'Jumlah (Orang)', 'Persentase (%)', 'Keterangan'],
      ['Total Basis Data Undangan', summary.total_peserta, '100%', 'Database tamu resmi'],
      ['• Jalur Blast Sistem', summary.jalur_blast ?? 0, `${summary.total_peserta > 0 ? (((summary.jalur_blast ?? 0) / summary.total_peserta) * 100).toFixed(1) : 0}%`, 'Dikelola sistem blast panitia'],
      ['• Jalur VIP Manual Klien', summary.jalur_manual ?? 0, `${summary.total_peserta > 0 ? (((summary.jalur_manual ?? 0) / summary.total_peserta) * 100).toFixed(1) : 0}%`, 'Didistribusikan langsung oleh tim klien'],
      ['Undangan Berhasil Terkirim (WA)', summary.wa_terkirim, `${summary.wa_persentase}%`, 'Pesan diterima tamu'],
      ['Undangan Belum Terkirim', summary.wa_belum_terkirim, `${(100 - summary.wa_persentase).toFixed(1)}%`, 'Menunggu giliran pengiriman'],
      ['Konfirmasi Hadir (RSVP)', summary.rsvp_hadir, `${summary.total_peserta > 0 ? ((summary.rsvp_hadir / summary.total_peserta) * 100).toFixed(1) : 0}%`, 'E-Ticket QR Code resmi diterbitkan'],
      ['Konfirmasi Berhalangan Hadir', summary.rsvp_berhalangan, `${summary.total_peserta > 0 ? ((summary.rsvp_berhalangan / summary.total_peserta) * 100).toFixed(1) : 0}%`, 'Tamu menyatakan tidak hadir'],
      ['Menunggu Konfirmasi RSVP', summary.rsvp_pending, `${summary.total_peserta > 0 ? ((summary.rsvp_pending / summary.total_peserta) * 100).toFixed(1) : 0}%`, 'Belum mengisi form konfirmasi'],
      ['Hadir di Lokasi Acara (Gate Scan)', summary.hadir_venue, `${summary.total_peserta > 0 ? ((summary.hadir_venue / summary.total_peserta) * 100).toFixed(1) : 0}%`, 'Scan QR di pintu masuk Gate'],
      ['Souvenir Terdistribusi', summary.souvenir_diambil ?? 0, `${summary.total_peserta > 0 ? (((summary.souvenir_diambil ?? 0) / summary.total_peserta) * 100).toFixed(1) : 0}%`, 'Paket souvenir telah diambil tamu'],
    ]

    const wsSummary = XLSX.utils.aoa_to_sheet(wsSummaryData)
    wsSummary['!cols'] = [
      { wch: 38 },
      { wch: 18 },
      { wch: 18 },
      { wch: 40 },
    ]

    // Sheet 2: Rekap Harian
    const wsDailyData: (string | number)[][] = [
      ['REKAPITULASI PROGRES PENGIRIMAN & RSVP HARIAN'],
      [''],
      ['Tanggal', 'Undangan WA Terkirim', 'Konfirmasi Hadir (RSVP)'],
    ]
    if (data.daily_breakdown && data.daily_breakdown.length > 0) {
      data.daily_breakdown.forEach((row) => {
        wsDailyData.push([
          new Date(row.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          row.wa_terkirim,
          row.rsvp_hadir,
        ])
      })
    }
    const wsDaily = XLSX.utils.aoa_to_sheet(wsDailyData)
    wsDaily['!cols'] = [{ wch: 32 }, { wch: 24 }, { wch: 24 }]

    // Sheet 3: Log Aktivitas Terbaru
    const wsLogData = [
      ['LOG RIWAYAT AKTIVITAS TERBARU (AUDIT TRAIL)'],
      [''],
      ['Waktu', 'Nama Tamu', 'ID Registrasi', 'Aktivitas', 'Keterangan'],
    ]
    if (data.recent_logs && data.recent_logs.length > 0) {
      data.recent_logs.forEach((log) => {
        wsLogData.push([
          log.created_at,
          log.participant_name || '-',
          log.id_registrasi || '-',
          log.activity,
          log.description,
        ])
      })
    }
    const wsLog = XLSX.utils.aoa_to_sheet(wsLogData)
    wsLog['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 24 }, { wch: 55 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Eksekutif')
    XLSX.utils.book_append_sheet(wb, wsDaily, 'Rekap Harian')
    XLSX.utils.book_append_sheet(wb, wsLog, 'Log Aktivitas')

    const timestamp = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `Laporan_Eksekutif_Event_${timestamp}.xlsx`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl my-8 rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8 shadow-2xl text-white space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header Modal */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Laporan Update Real-time & Harian
              </span>
            </div>
            <h2 className="text-2xl font-bold mt-1">Laporan Pengiriman & Kehadiran</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Peluncuran Buku: Timah, Manusia, dan Masa Depan
              {data?.generated_at && (
                <span className="ml-2 font-mono text-cyan-300">
                  (Per {new Date(data.generated_at).toLocaleTimeString('id-ID')} WIB)
                </span>
              )}
            </p>
          </div>

          {/* Action Buttons: Salin WA, Cetak/PDF, Excel, Refresh, Close */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Salin WA Formal */}
            <button
              type="button"
              onClick={copyWaSummary}
              disabled={loading || !summary}
              title="Salin rekap formal siap kirim ke WhatsApp pimpinan"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition active:scale-95 disabled:opacity-50"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
              </svg>
              {copied ? '✓ Tersalin Formal!' : 'Salin Rekap WA'}
            </button>

            {/* Cetak / Simpan PDF Formal */}
            <button
              type="button"
              onClick={exportFormalPdf}
              disabled={loading || !summary}
              title="Cetak atau simpan dokumen PDF resmi ber-kop surat dan tanda tangan"
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 px-3.5 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30 transition active:scale-95 disabled:opacity-50"
            >
              <span>📄</span> Cetak / PDF Resmi
            </button>

            {/* Unduh Excel (.xlsx) */}
            <button
              type="button"
              onClick={exportReportExcel}
              disabled={loading || !summary}
              title="Unduh laporan eksekutif lengkap format Excel (.xlsx)"
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 px-3.5 py-2.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/30 transition active:scale-95 disabled:opacity-50"
            >
              <span>📊</span> Unduh Excel
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={loadReport}
              disabled={loading}
              title="Perbarui data laporan terkini"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 active:scale-95"
            >
              <span className={loading ? 'animate-spin' : ''}>🔄</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-400 hover:text-white"
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

            {/* 5 Cards Metrik Ringkasan */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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

              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.06] p-4 col-span-2 sm:col-span-1">
                <p className="text-[11px] font-medium uppercase tracking-wider text-purple-400">Souvenir Diambil</p>
                <p className="mt-2 text-3xl font-black text-white">{summary.souvenir_diambil ?? 0}</p>
                <p className="mt-1 text-[11px] text-slate-400">{summary.souvenir_belum_diambil ?? (summary.total_peserta - (summary.souvenir_diambil ?? 0))} belum ambil</p>
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
