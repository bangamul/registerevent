import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  fetchLaporanHarian,
  findParticipants,
  type LaporanHarianResponse,
  type Participant,
  type TamuRsvpItem,
} from '../routes/dashboard/data'

interface DailyReportModalProps {
  isOpen: boolean
  onClose: () => void
  participants?: Participant[]
}

export function DailyReportModal({ isOpen, onClose, participants = [] }: DailyReportModalProps) {
  const [data, setData] = useState<LaporanHarianResponse | null>(null)
  const [fetchedParticipants, setFetchedParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function loadReport() {
    try {
      setLoading(true)
      setError('')
      const [resReport, resParts] = await Promise.allSettled([
        fetchLaporanHarian(),
        findParticipants(),
      ])

      if (resReport.status === 'fulfilled') {
        setData(resReport.value)
      } else {
        throw new Error('Gagal memuat laporan harian.')
      }

      if (resParts.status === 'fulfilled') {
        setFetchedParticipants(resParts.value)
      }
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

  // Daftar seluruh peserta dari props atau hasil fetch
  const allList = participants && participants.length > 0 ? participants : fetchedParticipants

  // Tamu Hadir: Prioritaskan data.tamu_hadir dari backend, jika kosong fallback otomatis ke filter peserta
  const rawHadir = (data?.tamu_hadir && data.tamu_hadir.length > 0)
    ? data.tamu_hadir
    : allList.filter((p) => {
        const rsvp = String(p.rsvp_status || '').toLowerCase().trim()
        return rsvp === 'confirmed' || (rsvp !== 'declined' && (Boolean(p.waktu_konfirmasi) || Number(p.status) === 1))
      })

  // Tamu Berhalangan: Prioritaskan data.tamu_berhalangan dari backend, jika kosong fallback otomatis ke filter peserta
  const rawBerhalangan = (data?.tamu_berhalangan && data.tamu_berhalangan.length > 0)
    ? data.tamu_berhalangan
    : allList.filter((p) => {
        const rsvp = String(p.rsvp_status || '').toLowerCase().trim()
        return rsvp === 'declined'
      })

  const tamuHadir = rawHadir as (TamuRsvpItem | Participant)[]
  const tamuBerhalangan = rawBerhalangan as (TamuRsvpItem | Participant)[]

  // Sinkronisasi angka jika ada selisih antara count dan list
  const rsvpHadirTotal = summary ? Math.max(summary.rsvp_hadir || 0, tamuHadir.length) : tamuHadir.length
  const rsvpBerhalanganTotal = summary ? Math.max(summary.rsvp_berhalangan || 0, tamuBerhalangan.length) : tamuBerhalangan.length

  // 1. FORMAT PESAN WHATSAPP RESMI & PROTOKOLER
  function copyWaSummary() {
    if (!summary || !data) return

    const nowStr = new Date().toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'short',
    })

    const rsvpPercent =
      summary.total_peserta > 0
        ? ((rsvpHadirTotal / summary.total_peserta) * 100).toFixed(1)
        : '0'

    const text = `*LAPORAN PERKEMBANGAN KONFIRMASI KEHADIRAN (RSVP)*
*Peluncuran Buku: Timah, Manusia, dan Masa Depan*

Kepada Yth.
*Bapak/Ibu Pimpinan & Panitia Penyelenggara*
di Tempat

Dengan hormat,
Bersama ini kami sampaikan laporan mutakhir rekapitulasi konfirmasi kehadiran tamu undangan per *${nowStr} WIB*:

I. REKAPITULASI STATISTIK RSVP
• Total Basis Data Undangan : *${summary.total_peserta} Tamu*
• Konfirmasi Hadir (E-Ticket Terbit) : *${rsvpHadirTotal} Tamu (${rsvpPercent}%)*
• Konfirmasi Berhalangan Hadir       : *${rsvpBerhalanganTotal} Tamu*
• Belum Memberikan Konfirmasi        : *${Math.max(0, summary.total_peserta - rsvpHadirTotal - rsvpBerhalanganTotal)} Tamu*
• Telah Hadir (Scan Pintu Gate)      : *${summary.hadir_venue} Tamu*
• Souvenir Terdistribusi             : *${summary.souvenir_diambil ?? 0} Tamu*

II. DAFTAR TAMU KONFIRMASI HADIR (${tamuHadir.length} Tamu)
${tamuHadir.length > 0 ? tamuHadir.map((t, idx) => `${idx + 1}. *${t.name}* - ${t.pekerjaan || 'Tamu Undangan'}`).join('\n') : '_Belum ada tamu yang konfirmasi hadir_'}

III. DAFTAR TAMU BERHALANGAN HADIR (${tamuBerhalangan.length} Tamu)
${tamuBerhalangan.length > 0 ? tamuBerhalangan.map((t, idx) => `${idx + 1}. *${t.name}* - ${t.pekerjaan || 'Tamu Undangan'}`).join('\n') : '_Tidak ada tamu yang menyatakan berhalangan_'}

IV. INFORMASI PELAKSANAAN ACARA
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
        ? ((rsvpHadirTotal / summary.total_peserta) * 100).toFixed(1)
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
          .font-mono { font-family: monospace; font-size: 9.5pt; }
          .section-header { font-size: 11pt; font-weight: bold; margin: 18px 0 6px 0; border-bottom: 1px solid #bbb; padding-bottom: 4px; }
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
            <tr style="background-color: #fafafa;">
              <td><b>Konfirmasi Kehadiran Hadir (RSVP)</b></td>
              <td class="text-right"><b>${rsvpHadirTotal}</b></td>
              <td class="text-right"><b>${rsvpPercent}%</b></td>
              <td><b>E-Ticket QR Code resmi telah diterbitkan</b></td>
            </tr>
            <tr>
              <td>Konfirmasi Berhalangan Hadir</td>
              <td class="text-right">${rsvpBerhalanganTotal}</td>
              <td class="text-right">${summary.total_peserta > 0 ? ((rsvpBerhalanganTotal / summary.total_peserta) * 100).toFixed(1) : 0}%</td>
              <td>Telah menyatakan tidak dapat hadir</td>
            </tr>
            <tr>
              <td>Menunggu Jawaban RSVP</td>
              <td class="text-right">${Math.max(0, summary.total_peserta - rsvpHadirTotal - rsvpBerhalanganTotal)}</td>
              <td class="text-right">${summary.total_peserta > 0 ? (((summary.total_peserta - rsvpHadirTotal - rsvpBerhalanganTotal) / summary.total_peserta) * 100).toFixed(1) : 0}%</td>
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

        <div class="section-header">II. DETAIL DAFTAR TAMU KONFIRMASI HADIR (${tamuHadir.length} ORANG)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 35px;" class="text-center">No</th>
              <th>Nama Lengkap Tamu</th>
              <th>Jabatan / Instansi</th>
              <th style="width: 110px;" class="text-center">ID Registrasi</th>
              <th style="width: 110px;" class="text-center">No. WhatsApp</th>
              <th style="width: 130px;" class="text-center">Waktu Konfirmasi</th>
            </tr>
          </thead>
          <tbody>
            ${
              tamuHadir.length > 0
                ? tamuHadir
                    .map(
                      (t, idx) => `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td><b>${t.name}</b></td>
                    <td>${t.pekerjaan || '-'}</td>
                    <td class="text-center font-mono">${t.id_registrasi}</td>
                    <td class="text-center">${t.notelp || '-'}</td>
                    <td class="text-center">${t.waktu_konfirmasi || '-'}</td>
                  </tr>
                `,
                    )
                    .join('')
                : `<tr><td colspan="6" class="text-center" style="color: #666; padding: 12px;">Belum ada tamu yang konfirmasi hadir</td></tr>`
            }
          </tbody>
        </table>

        <div class="section-header">III. DETAIL DAFTAR TAMU KONFIRMASI BERHALANGAN HADIR (${tamuBerhalangan.length} ORANG)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 35px;" class="text-center">No</th>
              <th>Nama Lengkap Tamu</th>
              <th>Jabatan / Instansi</th>
              <th style="width: 110px;" class="text-center">ID Registrasi</th>
              <th style="width: 110px;" class="text-center">No. WhatsApp</th>
              <th style="width: 130px;" class="text-center">Waktu Konfirmasi</th>
            </tr>
          </thead>
          <tbody>
            ${
              tamuBerhalangan.length > 0
                ? tamuBerhalangan
                    .map(
                      (t, idx) => `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td><b>${t.name}</b></td>
                    <td>${t.pekerjaan || '-'}</td>
                    <td class="text-center font-mono">${t.id_registrasi}</td>
                    <td class="text-center">${t.notelp || '-'}</td>
                    <td class="text-center">${t.waktu_konfirmasi || '-'}</td>
                  </tr>
                `,
                    )
                    .join('')
                : `<tr><td colspan="6" class="text-center" style="color: #666; padding: 12px;">Tidak ada tamu yang menyatakan berhalangan hadir</td></tr>`
            }
          </tbody>
        </table>

        ${
          data.daily_breakdown && data.daily_breakdown.length > 0
            ? `
          <div class="section-header">IV. REKAPITULASI PROGRES RSVP HARIAN</div>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th class="text-right">Konfirmasi Hadir (RSVP)</th>
              </tr>
            </thead>
            <tbody>
              ${data.daily_breakdown
                .map(
                  (row) => `
                <tr>
                  <td>${new Date(row.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
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

        <div class="section-header">V. DETAIL WAKTU & LOKASI ACARA</div>
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

    // Sheet 1: Ringkasan Eksekutif & Detail Tamu
    const wsSummaryData: (string | number)[][] = [
      ['LAPORAN EKSEKUTIF REAL-TIME DISTRIBUSI UNDANGAN & RSVP'],
      ['Acara: Peluncuran Buku Timah, Manusia, dan Masa Depan'],
      [`Waktu Pembaruan: ${nowStr} WIB`],
      [''],
      ['I. RINGKASAN DATA STATISTIK UTAMA'],
      ['Indikator Parameter', 'Jumlah (Orang)', 'Persentase (%)', 'Keterangan'],
      ['Total Basis Data Undangan', summary.total_peserta, '100%', 'Database tamu resmi'],
      ['Konfirmasi Hadir (RSVP)', rsvpHadirTotal, `${summary.total_peserta > 0 ? ((rsvpHadirTotal / summary.total_peserta) * 100).toFixed(1) : 0}%`, 'E-Ticket QR Code resmi diterbitkan'],
      ['Konfirmasi Berhalangan Hadir', rsvpBerhalanganTotal, `${summary.total_peserta > 0 ? ((rsvpBerhalanganTotal / summary.total_peserta) * 100).toFixed(1) : 0}%`, 'Tamu menyatakan tidak hadir'],
      ['Menunggu Konfirmasi RSVP', Math.max(0, summary.total_peserta - rsvpHadirTotal - rsvpBerhalanganTotal), `${summary.total_peserta > 0 ? (((summary.total_peserta - rsvpHadirTotal - rsvpBerhalanganTotal) / summary.total_peserta) * 100).toFixed(1) : 0}%`, 'Belum mengisi form konfirmasi'],
      ['Hadir di Lokasi Acara (Gate Scan)', summary.hadir_venue, `${summary.total_peserta > 0 ? ((summary.hadir_venue / summary.total_peserta) * 100).toFixed(1) : 0}%`, 'Scan QR di pintu masuk Gate'],
      ['Souvenir Terdistribusi', summary.souvenir_diambil ?? 0, `${summary.total_peserta > 0 ? (((summary.souvenir_diambil ?? 0) / summary.total_peserta) * 100).toFixed(1) : 0}%`, 'Paket souvenir telah diambil tamu'],
      [''],
      ['II. DETAIL DAFTAR TAMU KONFIRMASI HADIR (E-TICKET RESMI TERBIT)'],
      ['No', 'Nama Lengkap Tamu', 'Jabatan / Instansi', 'ID Registrasi', 'Nomor WhatsApp', 'Waktu Konfirmasi'],
    ]

    if (tamuHadir.length > 0) {
      tamuHadir.forEach((t, idx) => {
        wsSummaryData.push([
          idx + 1,
          t.name,
          t.pekerjaan || '-',
          t.id_registrasi,
          t.notelp || '-',
          t.waktu_konfirmasi || '-',
        ])
      })
    } else {
      wsSummaryData.push(['-', 'Belum ada tamu yang konfirmasi hadir', '', '', '', ''])
    }

    wsSummaryData.push([''])
    wsSummaryData.push(['III. DETAIL DAFTAR TAMU KONFIRMASI BERHALANGAN HADIR'])
    wsSummaryData.push(['No', 'Nama Lengkap Tamu', 'Jabatan / Instansi', 'ID Registrasi', 'Nomor WhatsApp', 'Waktu Konfirmasi'])

    if (tamuBerhalangan.length > 0) {
      tamuBerhalangan.forEach((t, idx) => {
        wsSummaryData.push([
          idx + 1,
          t.name,
          t.pekerjaan || '-',
          t.id_registrasi,
          t.notelp || '-',
          t.waktu_konfirmasi || '-',
        ])
      })
    } else {
      wsSummaryData.push(['-', 'Tidak ada tamu yang menyatakan berhalangan hadir', '', '', '', ''])
    }

    const wsSummary = XLSX.utils.aoa_to_sheet(wsSummaryData)
    wsSummary['!cols'] = [
      { wch: 6 },
      { wch: 38 },
      { wch: 50 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
    ]

    // Sheet 2: Khusus Tamu Hadir
    const wsHadirData: (string | number)[][] = [
      ['DAFTAR LENGKAP TAMU KONFIRMASI HADIR (E-TICKET RESMI TERBIT)'],
      [`Total: ${tamuHadir.length} Tamu • Waktu Unduh: ${nowStr} WIB`],
      [''],
      ['No', 'ID Registrasi', 'Nama Lengkap Tamu', 'Jabatan / Instansi', 'Nomor WhatsApp', 'Waktu Konfirmasi Kehadiran'],
    ]
    if (tamuHadir.length > 0) {
      tamuHadir.forEach((t, idx) => {
        wsHadirData.push([
          idx + 1,
          t.id_registrasi,
          t.name,
          t.pekerjaan || '-',
          t.notelp || '-',
          t.waktu_konfirmasi || '-',
        ])
      })
    } else {
      wsHadirData.push(['-', '-', 'Belum ada tamu yang konfirmasi hadir', '-', '-', '-'])
    }
    const wsHadir = XLSX.utils.aoa_to_sheet(wsHadirData)
    wsHadir['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 38 },
      { wch: 50 },
      { wch: 18 },
      { wch: 24 },
    ]

    // Sheet 3: Khusus Tamu Berhalangan
    const wsBerhalanganData: (string | number)[][] = [
      ['DAFTAR TAMU KONFIRMASI BERHALANGAN HADIR'],
      [`Total: ${tamuBerhalangan.length} Tamu • Waktu Unduh: ${nowStr} WIB`],
      [''],
      ['No', 'ID Registrasi', 'Nama Lengkap Tamu', 'Jabatan / Instansi', 'Nomor WhatsApp', 'Waktu Konfirmasi Berhalangan'],
    ]
    if (tamuBerhalangan.length > 0) {
      tamuBerhalangan.forEach((t, idx) => {
        wsBerhalanganData.push([
          idx + 1,
          t.id_registrasi,
          t.name,
          t.pekerjaan || '-',
          t.notelp || '-',
          t.waktu_konfirmasi || '-',
        ])
      })
    } else {
      wsBerhalanganData.push(['-', '-', 'Tidak ada tamu yang menyatakan berhalangan', '-', '-', '-'])
    }
    const wsBerhalangan = XLSX.utils.aoa_to_sheet(wsBerhalanganData)
    wsBerhalangan['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 38 },
      { wch: 50 },
      { wch: 18 },
      { wch: 24 },
    ]

    // Sheet 4: Rekap Harian
    const wsDailyData: (string | number)[][] = [
      ['REKAPITULASI PROGRES KONFIRMASI HADIR (RSVP) HARIAN'],
      [''],
      ['Tanggal', 'Konfirmasi Hadir (RSVP)'],
    ]
    if (data.daily_breakdown && data.daily_breakdown.length > 0) {
      data.daily_breakdown.forEach((row) => {
        wsDailyData.push([
          new Date(row.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          row.rsvp_hadir,
        ])
      })
    }
    const wsDaily = XLSX.utils.aoa_to_sheet(wsDailyData)
    wsDaily['!cols'] = [{ wch: 32 }, { wch: 26 }]

    // Sheet 5: Log Aktivitas Terbaru
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
    XLSX.utils.book_append_sheet(wb, wsHadir, 'Tamu Hadir')
    XLSX.utils.book_append_sheet(wb, wsBerhalangan, 'Tamu Berhalangan')
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
            {/* Progress Bar Konfirmasi Kehadiran (RSVP) */}
            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Progres Konfirmasi Kehadiran Tamu (RSVP)</span>
                <span className="font-bold text-cyan-400">
                  {summary.rsvp_hadir} / {summary.total_peserta} ({summary.total_peserta > 0 ? ((summary.rsvp_hadir / summary.total_peserta) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-amber-400 transition-all duration-500"
                  style={{ width: `${summary.total_peserta > 0 ? Math.min(100, (summary.rsvp_hadir / summary.total_peserta) * 100) : 0}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                <span className="text-emerald-400 font-medium">🟢 {summary.rsvp_hadir} Konfirmasi Hadir</span>
                <span className="text-rose-400 font-medium">🔴 {summary.rsvp_berhalangan} Berhalangan</span>
                <span className="text-slate-500 font-medium">⏳ {summary.rsvp_pending} Menunggu Konfirmasi</span>
              </div>
            </div>

            {/* 5 Cards Metrik Ringkasan */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Undangan</p>
                <p className="mt-2 text-3xl font-black text-white">{summary.total_peserta}</p>
                <p className="mt-1 text-[11px] text-slate-400">Basis data resmi</p>
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-cyan-400">RSVP Hadir</p>
                <p className="mt-2 text-3xl font-black text-white">{rsvpHadirTotal}</p>
                <p className="mt-1 text-[11px] text-emerald-400">E-Ticket Terbit</p>
              </div>

              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-rose-400">Berhalangan</p>
                <p className="mt-2 text-3xl font-black text-white">{rsvpBerhalanganTotal}</p>
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

            {/* Detail Daftar Tamu Konfirmasi Hadir */}
            <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <span>🟢</span>
                  <span>Detail Tamu Konfirmasi Hadir ({tamuHadir.length} Tamu)</span>
                </h3>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  E-Ticket QR Terbit
                </span>
              </div>
              {tamuHadir.length > 0 ? (
                <div className="max-h-64 overflow-y-auto pr-1">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th className="py-2 px-2.5 w-8">No</th>
                        <th className="py-2 px-2.5">Nama Tamu</th>
                        <th className="py-2 px-2.5">Jabatan / Instansi</th>
                        <th className="py-2 px-2.5">No. WhatsApp</th>
                        <th className="py-2 px-2.5">Waktu Konfirmasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {tamuHadir.map((t, idx) => (
                        <tr key={t.id} className="hover:bg-white/[0.02]">
                          <td className="py-2 px-2.5 text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-bold text-white">
                            <div>{t.name}</div>
                            <div className="font-mono text-[10px] text-cyan-400">{t.id_registrasi}</div>
                          </td>
                          <td className="py-2 px-2.5 text-slate-300">{t.pekerjaan || '-'}</td>
                          <td className="py-2 px-2.5 font-mono text-slate-400">{t.notelp || '-'}</td>
                          <td className="py-2 px-2.5 text-slate-400 text-[11px]">
                            {t.waktu_konfirmasi ? new Date(t.waktu_konfirmasi).toLocaleString('id-ID') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center">Belum ada tamu yang mengonfirmasi kehadiran.</p>
              )}
            </div>

            {/* Detail Daftar Tamu Konfirmasi Berhalangan Hadir */}
            <div className="rounded-2xl border border-rose-500/20 bg-slate-950/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <span>🔴</span>
                  <span>Detail Tamu Konfirmasi Berhalangan ({tamuBerhalangan.length} Tamu)</span>
                </h3>
                <span className="rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-rose-300">
                  Menyatakan Tidak Hadir
                </span>
              </div>
              {tamuBerhalangan.length > 0 ? (
                <div className="max-h-64 overflow-y-auto pr-1">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th className="py-2 px-2.5 w-8">No</th>
                        <th className="py-2 px-2.5">Nama Tamu</th>
                        <th className="py-2 px-2.5">Jabatan / Instansi</th>
                        <th className="py-2 px-2.5">No. WhatsApp</th>
                        <th className="py-2 px-2.5">Waktu Konfirmasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {tamuBerhalangan.map((t, idx) => (
                        <tr key={t.id} className="hover:bg-white/[0.02]">
                          <td className="py-2 px-2.5 text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-bold text-white">
                            <div>{t.name}</div>
                            <div className="font-mono text-[10px] text-cyan-400">{t.id_registrasi}</div>
                          </td>
                          <td className="py-2 px-2.5 text-slate-300">{t.pekerjaan || '-'}</td>
                          <td className="py-2 px-2.5 font-mono text-slate-400">{t.notelp || '-'}</td>
                          <td className="py-2 px-2.5 text-slate-400 text-[11px]">
                            {t.waktu_konfirmasi ? new Date(t.waktu_konfirmasi).toLocaleString('id-ID') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center">Tidak ada tamu yang menyatakan berhalangan hadir.</p>
              )}
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
