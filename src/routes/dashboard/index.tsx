import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import * as XLSX from 'xlsx'
import {
  findParticipants,
  getLastActivityLogs,
  getSesiList,
  matchesSesi,
  updateJalurUndangan,
  updateWaStatusManual,
  fetchRsvpSettings,
  type RsvpSettings,
  type Participant,
} from './data'
import { WaBlastModal } from '../../components/WaBlastModal'
import { DailyReportModal } from '../../components/DailyReportModal'
import { RsvpControlModal } from '../../components/RsvpControlModal'

type SortOption = 'name' | 'latest' | 'oldest'
type SesiFilter = 'all' | number
type WaFilter = 'all' | 'sent' | 'unsent'
type JalurFilter = 'all' | 'blast' | 'manual'

export function DashboardPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [lastLogs, setLastLogs] = useState<Record<number, string>>({})
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('name')
  const [sesiFilter, setSesiFilter] = useState<SesiFilter>('all')
  const [waFilter, setWaFilter] = useState<WaFilter>('all')
  const [jalurFilter, setJalurFilter] = useState<JalurFilter>('all')
  const [pageSize, setPageSize] = useState<number>(25)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isWaModalOpen, setIsWaModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isRsvpModalOpen, setIsRsvpModalOpen] = useState(false)
  const [rsvpSettings, setRsvpSettings] = useState<RsvpSettings | null>(null)

  // Seleksi masal & domain RSVP
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false)
  const [publicOrigin, setPublicOrigin] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rsvp_public_origin') || window.location.origin
    }
    return 'http://localhost:5173'
  })
  const [tempOrigin, setTempOrigin] = useState(publicOrigin)

  const navigate = useNavigate()

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      const [participantData, logData, rsvpData] = await Promise.all([
        findParticipants(),
        getLastActivityLogs(),
        fetchRsvpSettings().catch(() => null),
      ])

      setParticipants(participantData)
      setLastLogs(logData)
      if (rsvpData) {
        setRsvpSettings(rsvpData)
      }
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

  useEffect(() => {
    void loadData()

    function onFocus() {
      void loadData()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // Simpan domain publik jika diubah
  function savePublicOrigin() {
    let clean = tempOrigin.trim()
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean
    }
    clean = clean.replace(/\/+$/, '')
    setPublicOrigin(clean)
    localStorage.setItem('rsvp_public_origin', clean)
    setIsDomainModalOpen(false)
    showToast(`Domain RSVP berhasil disimpan: ${clean}`)
  }

  // Daftar sesi buat dropdown filter, dinamis dari role_permission tertinggi
  const sesiList = useMemo(() => getSesiList(participants), [participants])

  const filteredParticipants = useMemo(() => {
    return [...participants]
      .filter((participant) =>
        participant.name
          .toLowerCase()
          .includes(search.toLowerCase().trim()),
      )
      .filter((participant) =>
        sesiFilter === 'all' ? true : matchesSesi(participant, sesiFilter),
      )
      .filter((participant) => {
        if (waFilter === 'sent') return participant.wa_status === 'sent'
        if (waFilter === 'unsent') return participant.wa_status !== 'sent'
        return true
      })
      .filter((participant) => {
        if (jalurFilter === 'blast') return participant.jalur_undangan !== 'manual'
        if (jalurFilter === 'manual') return participant.jalur_undangan === 'manual'
        return true
      })
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
  }, [participants, search, sesiFilter, waFilter, jalurFilter, sort])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredParticipants.length / pageSize),
  )

  const visibleParticipants = useMemo(() => {
    return filteredParticipants.slice(
      (page - 1) * pageSize,
      page * pageSize,
    )
  }, [filteredParticipants, page, pageSize])

  const presentCount = participants.filter((p) => p.status).length
  const confirmedRsvpCount = participants.filter((p) => p.rsvp_status === 'confirmed').length
  const waSentCount = participants.filter((p) => p.wa_status === 'sent').length
  const blastCount = participants.filter((p) => p.jalur_undangan !== 'manual').length
  const manualCount = participants.filter((p) => p.jalur_undangan === 'manual').length
  const souvenirClaimedCount = participants.filter(
    (p) => p.souvenir_status === 'claimed' || Boolean(p.waktu_souvenir),
  ).length

  // Checkbox multi-select
  function toggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  function selectAllVisible() {
    const visibleIds = visibleParticipants.map((p) => p.id)
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])))
    }
  }

  // Ubah jalur masal (Bulk Action)
  async function handleBulkSetJalur(jalur: 'blast' | 'manual') {
    if (selectedIds.length === 0) return
    try {
      setLoading(true)
      await updateJalurUndangan(selectedIds, jalur)
      setParticipants((prev) =>
        prev.map((p) => (selectedIds.includes(p.id) ? { ...p, jalur_undangan: jalur } : p)),
      )
      showToast(
        `Berhasil mengubah ${selectedIds.length} peserta ke Jalur ${
          jalur === 'manual' ? 'VIP Manual (Klien)' : 'Blast Sistem'
        }`,
      )
      setSelectedIds([])
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal memperbarui jalur undangan')
    } finally {
      setLoading(false)
    }
  }

  // Toggle jalur per peserta
  async function handleToggleJalur(participant: Participant) {
    const newJalur = participant.jalur_undangan === 'manual' ? 'blast' : 'manual'
    try {
      await updateJalurUndangan(participant.id, newJalur)
      setParticipants((prev) =>
        prev.map((p) => (p.id === participant.id ? { ...p, jalur_undangan: newJalur } : p)),
      )
      showToast(
        `${participant.name} dialihkan ke Jalur ${
          newJalur === 'manual' ? 'VIP Manual Klien' : 'Blast Sistem'
        }`,
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengubah jalur')
    }
  }

  // Salin Link RSVP Global
  function handleCopyRsvpLink(participant: Participant) {
    const rsvpUrl = `${publicOrigin}/landing`
    navigator.clipboard.writeText(rsvpUrl).then(() => {
      setCopiedId(participant.id)
      showToast(`✓ Link RSVP Resmi (${participant.name}) berhasil disalin!`)
      setTimeout(() => setCopiedId(null), 2500)
    })
  }

  // Tandai WA Terkirim Manual
  async function handleMarkWaManual(participant: Participant) {
    try {
      await updateWaStatusManual(participant.id_registrasi, 'manual_sent')
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participant.id
            ? { ...p, wa_status: 'sent', waktu_kirim_wa: new Date().toISOString() }
            : p,
        ),
      )
      showToast(`Status WA untuk ${participant.name} ditandai Terkirim Manual`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menandai status WA')
    }
  }

  // Export Excel Resmi (.xlsx) dengan SheetJS agar terbuka sempurna di Excel, ONLYOFFICE, & Google Sheets
  function exportToExcel(targetMode: 'all' | 'manual' | 'blast' = 'all') {
    let targetList = participants
    if (targetMode === 'manual') {
      targetList = participants.filter((p) => p.jalur_undangan === 'manual')
    } else if (targetMode === 'blast') {
      targetList = participants.filter((p) => p.jalur_undangan !== 'manual')
    }

    if (targetList.length === 0) {
      alert(`Tidak ada data peserta untuk kategori ${targetMode}.`)
      return
    }

    // Header tabel
    const headers = [
      'No',
      'ID Registrasi',
      'Nama Lengkap',
      'Jabatan / Instansi',
      'No. WhatsApp',
      'Email',
      'Gate',
      'Jalur Undangan',
      'Status Undangan WA',
      'Waktu Kirim WA',
      'Status RSVP',
      'Status Hadir Venue',
      'Status Souvenir',
      'Waktu Ambil Souvenir',
      'URL Konfirmasi RSVP (Tamu)',
      'Teks Undangan WA (Siap Kirim)',
      'Klik Kirim WhatsApp Web',
    ]

    // Data baris
    const rows: (string | number)[][] = []

    targetList.forEach((p, idx) => {
      const rawPhone = p.notelp || ''
      const cleanPhone = rawPhone.replace(/\D/g, '')
      const phone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone
      const rsvpUrl = `${publicOrigin}/landing`
      const isManual = p.jalur_undangan === 'manual'
      const draftText = `Kepada Yth. *${p.name}*, kami mengundang Bapak/Ibu hadir pada *Peluncuran Buku: Timah, Manusia, dan Masa Depan* (Senin, 9 Nov 2026 di Hotel Borobudur). Mohon konfirmasi kehadiran Anda di tautan resmi: ${rsvpUrl}`
      const waLink = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(draftText)}`

      rows.push([
        idx + 1,
        p.id_registrasi || '-',
        p.name || '-',
        p.pekerjaan || '-',
        p.notelp ? `'${p.notelp}` : '-',
        p.email || '-',
        p.gate ? `Gate ${p.gate}` : '-',
        isManual ? '👑 VIP Manual Klien' : '🚀 Blast Sistem',
        p.wa_status === 'sent' ? 'Terkirim' : 'Belum Kirim',
        p.waktu_kirim_wa ? new Date(p.waktu_kirim_wa).toLocaleString('id-ID') : '-',
        p.rsvp_status === 'confirmed'
          ? '✓ Konfirmasi Hadir'
          : p.rsvp_status === 'declined'
            ? '✗ Berhalangan'
            : 'Menunggu RSVP',
        p.status ? 'Hadir di Venue' : 'Belum Validasi',
        p.souvenir_status === 'claimed' || p.waktu_souvenir ? '✓ Sudah Ambil' : 'Belum Ambil',
        p.waktu_souvenir ? new Date(p.waktu_souvenir).toLocaleString('id-ID') : '-',
        rsvpUrl,
        draftText,
        waLink,
      ])
    })

    // Buat worksheet dari array data
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

    // Atur lebar kolom yang proporsional & leluasa (agar tidak gepeng/terpotong)
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 16 }, // ID Registrasi
      { wch: 28 }, // Nama Lengkap
      { wch: 26 }, // Jabatan / Instansi
      { wch: 18 }, // No. WhatsApp
      { wch: 24 }, // Email
      { wch: 10 }, // Gate
      { wch: 20 }, // Jalur Undangan
      { wch: 20 }, // Status Undangan WA
      { wch: 22 }, // Waktu Kirim WA
      { wch: 22 }, // Status RSVP
      { wch: 20 }, // Status Hadir Venue
      { wch: 18 }, // Status Souvenir
      { wch: 22 }, // Waktu Ambil Souvenir
      { wch: 45 }, // URL Konfirmasi RSVP
      { wch: 60 }, // Teks Undangan WA
      { wch: 32 }, // Klik Kirim WhatsApp Web
    ]

    // Tambahkan hyperlink aktif pada kolom URL dan WhatsApp
    targetList.forEach((p, idx) => {
      const rowIndex = idx + 1 // 0-based for row index in sheet, row 0 is header
      const rawPhone = p.notelp || ''
      const cleanPhone = rawPhone.replace(/\D/g, '')
      const phone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone
      const rsvpUrl = `${publicOrigin}/landing?idRegistrasi=${p.id_registrasi}`
      const draftText = `Kepada Yth. *${p.name}*, kami mengundang Bapak/Ibu hadir pada *Peluncuran Buku: Timah, Manusia, dan Masa Depan* (Senin, 9 Nov 2026 di Hotel Borobudur). Mohon konfirmasi kehadiran Anda di tautan resmi: ${rsvpUrl}`
      const waLink = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(draftText)}`

      // Kolom O (index 14): URL Konfirmasi RSVP
      const rsvpRef = XLSX.utils.encode_cell({ r: rowIndex, c: 14 })
      if (ws[rsvpRef]) {
        ws[rsvpRef].l = { Target: rsvpUrl, Tooltip: 'Buka Link Konfirmasi Tamu' }
      }

      // Kolom Q (index 16): Link WhatsApp Web
      const waRef = XLSX.utils.encode_cell({ r: rowIndex, c: 16 })
      if (ws[waRef]) {
        ws[waRef].v = '💬 Klik Buka WhatsApp Web'
        ws[waRef].l = { Target: waLink, Tooltip: 'Kirim via WhatsApp Web' }
      }
    })

    // Buat workbook
    const wb = XLSX.utils.book_new()
    const sheetName = targetMode === 'manual' ? 'VIP Manual Klien' : 'Data Peserta Event'
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    // Nama file .xlsx asli
    const timestamp = new Date().toISOString().slice(0, 10)
    const filename =
      targetMode === 'manual'
        ? `Undangan_VIP_Manual_Klien_${timestamp}.xlsx`
        : `Data_Peserta_Event_${timestamp}.xlsx`

    // Tulis dan unduh file binary .xlsx
    XLSX.writeFile(wb, filename)
    showToast(`✓ File ${filename} berhasil diunduh`)
  }

  function openParticipant(participant: Participant) {
    navigate({
      to: '/dashboard/detail/$idRegistrasi',
      params: { idRegistrasi: participant.id_registrasi },
    })
  }

  const allVisibleSelected =
    visibleParticipants.length > 0 &&
    visibleParticipants.every((p) => selectedIds.includes(p.id))

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Toast Notifikasi */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-slate-900/95 px-5 py-3 text-sm font-semibold text-emerald-300 shadow-2xl backdrop-blur-md transition-all animate-bounce">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            {toastMessage}
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
              Overview & Distribusi Undangan
            </p>

            <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
              Dashboard Peserta
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            {/* Tombol Domain RSVP */}
            <button
              type="button"
              onClick={() => {
                setTempOrigin(publicOrigin)
                setIsDomainModalOpen(true)
              }}
              title="Atur domain publik untuk generate link RSVP"
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-xs font-mono text-cyan-300 hover:border-cyan-500 hover:bg-slate-800 transition"
            >
              <span className="max-w-[140px] truncate sm:max-w-none">{publicOrigin.replace(/^https?:\/\//, '')}</span>
            </button>

            {/* Tombol Laporan Harian */}
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:border-cyan-500/60 hover:bg-cyan-500/30 active:scale-95"
            >
              Laporan Harian
            </button>

            {/* Tombol Status Buka/Tutup Link RSVP /landing */}
            <button
              type="button"
              onClick={() => setIsRsvpModalOpen(true)}
              title="Atur buka atau tutup link konfirmasi (/landing) untuk tamu"
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold shadow-sm transition active:scale-95 ${
                rsvpSettings?.status === 'closed'
                  ? 'border-rose-500/60 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                  : 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  rsvpSettings?.status === 'closed' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'
                }`}
              />
              <span>
                Link RSVP:{' '}
                <strong className={rsvpSettings?.status === 'closed' ? 'text-rose-400' : 'text-emerald-400'}>
                  {rsvpSettings?.status === 'closed' ? 'DITUTUP' : 'BUKA'}
                </strong>
              </span>
            </button>

            {/* Tombol Segarkan Data */}
            <button
              type="button"
              onClick={() => void loadData()}
              title="Segarkan data terbaru dari database"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white transition active:scale-95 hidden!"
            >
              <span>{loading ? 'Memuat...' : 'Segarkan'}</span>
            </button>

            {/* Tombol Blast WA */}
            <button
              type="button"
              onClick={() => setIsWaModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition hover:border-emerald-500/60 hover:bg-emerald-500/30 active:scale-95"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.83a8.19 8.19 0 01-5.82 2.41h-.01c-1.46 0-2.88-.38-4.14-1.11l-.3-.17-3.12.82.83-3.04-.19-.31a8.16 8.16 0 01-1.25-4.43c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.98-.14.17-.29.19-.54.06-.25-.13-1.07-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.41 1.44.53.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.2-.59.2-1.09.14-1.19-.06-.1-.23-.17-.48-.29z" />
              </svg>
              Blast WhatsApp
            </button>

            {/* Tombol Export Excel (Khusus VIP Klien & Semua) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => exportToExcel('manual')}
                title={`Download Excel ${manualCount} peserta VIP Manual yang akan dikirim sendiri oleh klien`}
                className="inline-flex items-center justify-center rounded-xl border border-purple-500/40 bg-purple-500/20 px-3.5 py-2.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/30 transition active:scale-95"
              >
                Export VIP Klien {manualCount > 0 ? `(${manualCount})` : ''}
              </button>

              <button
                type="button"
                onClick={() => exportToExcel('all')}
                title="Download Excel seluruh database peserta"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition active:scale-95"
              >
                Export Semua
              </button>
            </div>

            {/* Tombol Meja Souvenir */}
            <Link
              to="/validation/souvenir"
              title="Buka Station Scan QR Meja Pengambilan Souvenir"
              className="inline-flex items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/20 px-3.5 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition active:scale-95 hidden!"
            >
              Meja Souvenir
            </Link>

            {/* Tambah Peserta */}
            <Link
              to="/dashboard/create"
              className="capitalize inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 active:scale-95"
            >
              Tambah data peserta
            </Link>
          </div>
        </header>

        {/* Kartu Ringkasan Metrik */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            label="Total Undangan"
            value={participants.length}
            sub={`${blastCount} Blast • ${manualCount} VIP Manual`}
            tone="white"
          />
          <SummaryCard
            label="Undangan WA Terkirim"
            value={waSentCount}
            sub={`${participants.length - waSentCount} belum terkirim`}
            tone="emerald"
          />
          <SummaryCard
            label="Konfirmasi Hadir (RSVP)"
            value={confirmedRsvpCount}
            sub="Sudah konfirmasi tiket"
            tone="cyan"
          />
          <SummaryCard
            label="Hadir di Venue (Gate)"
            value={presentCount}
            sub="Tiba di lokasi acara"
            tone="amber"
          />
          <SummaryCard
            label="Souvenir Terdistribusi"
            value={souvenirClaimedCount}
            sub={`${participants.length - souvenirClaimedCount} belum ambil`}
            tone="purple"
          />
        </section>

        {/* Tabel Section */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-6 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Daftar Peserta & Jalur Undangan</h2>
              <p className="mt-1 text-sm text-slate-400">
                Menampilkan {visibleParticipants.length} dari {filteredParticipants.length} peserta.
              </p>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Cari nama peserta..."
                className="w-full sm:w-48 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
              />

              {/* Filter Jalur Pengiriman */}
              <select
                value={jalurFilter}
                onChange={(event) => {
                  setJalurFilter(event.target.value as JalurFilter)
                  setPage(1)
                }}
                className="w-full sm:w-44 rounded-xl border border-purple-500/40 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-purple-300 outline-none focus:border-purple-400"
              >
                <option value="all">Semua Jalur ({participants.length})</option>
                <option value="blast">Jalur Blast ({blastCount})</option>
                <option value="manual">VIP Manual Klien ({manualCount})</option>
              </select>

              {/* Filter Status WA */}
              <select
                value={waFilter}
                onChange={(event) => {
                  setWaFilter(event.target.value as WaFilter)
                  setPage(1)
                }}
                className="w-full sm:w-36 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              >
                <option value="all">Semua Status WA</option>
                <option value="sent">WA: Terkirim</option>
                <option value="unsent">WA: Belum Kirim</option>
              </select>

              {/* Filter Sesi */}
              <select
                value={sesiFilter}
                onChange={(event) => {
                  const value = event.target.value
                  setSesiFilter(value === 'all' ? 'all' : Number(value))
                  setPage(1)
                }}
                className="w-full sm:w-32 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              >
                <option value="all">Semua Sesi</option>
                {sesiList.map((sesiKe) => (
                  <option key={sesiKe} value={sesiKe}>
                    Sesi {sesiKe}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as SortOption)
                  setPage(1)
                }}
                className="w-full sm:w-36 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              >
                <option value="name">Nama A-Z</option>
                <option value="latest">Kehadiran baru</option>
                <option value="oldest">Kehadiran lama</option>
              </select>

              {/* Page size dropdown */}
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setPage(1)
                }}
                className="w-full sm:w-32 rounded-xl border border-emerald-500/40 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-emerald-400 outline-none focus:border-emerald-400 hidden!"
                title="Jumlah data per halaman"
              >
                <option value={10}>Show 10</option>
                <option value={20}>Show 20</option>
                <option value={25}>Show 25</option>
                <option value={50}>Show 50</option>
                <option value={100}>Show 100</option>
                <option value={1000}>Semua Data</option>
              </select>
            </div>
          </div>

          {/* Bulk Action Bar (Muncul saat ada peserta yang dicentang) */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/40 p-4 transition-all animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-[11px] font-bold text-slate-950">
                  {selectedIds.length}
                </span>
                <span>Peserta Dipilih</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkSetJalur('manual')}
                  className="rounded-xl border border-purple-500/40 bg-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/30 transition"
                >
                  Tandai VIP Manual Klien ({selectedIds.length})
                </button>

                <button
                  type="button"
                  onClick={() => handleBulkSetJalur('blast')}
                  className="rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30 transition"
                >
                  Kembalikan ke Jalur Blast ({selectedIds.length})
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="py-12 text-center text-slate-500">
              Memuat data peserta...
            </div>
          )}

          {!loading && error && (
            <div className="py-12 text-center text-red-400">{error}</div>
          )}

          {!loading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={selectAllVisible}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-cyan-400 cursor-pointer"
                          title="Pilih semua di halaman ini"
                        />
                      </th>
                      <th className="px-3 py-4 w-12">No</th>
                      <th className="px-4 py-4">Tamu & Undangan</th>
                      <th className="px-3 py-4">Jalur Distribusi</th>
                      <th className="px-3 py-4">Kehadiran Venue</th>
                      <th className="px-4 py-4 text-right">Aksi Undangan</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleParticipants.map((participant, index) => (
                      <ParticipantTableRow
                        key={participant.id}
                        participant={participant}
                        lastLogTime={lastLogs[participant.id]}
                        number={(page - 1) * pageSize + index + 1}
                        isSelected={selectedIds.includes(participant.id)}
                        isCopied={copiedId === participant.id}
                        onToggleSelect={toggleSelect}
                        onToggleJalur={handleToggleJalur}
                        onCopyLink={handleCopyRsvpLink}
                        onMarkWaSent={handleMarkWaManual}
                        onView={openParticipant}
                      />
                    ))}
                  </tbody>
                </table>

                {visibleParticipants.length === 0 && (
                  <p className="py-12 text-center text-slate-500">
                    Peserta tidak ditemukan untuk filter ini.
                  </p>
                )}
              </div>

              {/* Pagination bar */}
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
                <div className="flex flex-wrap items-center gap-3">
                  <span>
                    Halaman {page} dari {totalPages} ({filteredParticipants.length} total peserta)
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Tampilkan:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value))
                        setPage(1)
                      }}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white outline-none focus:border-cyan-400"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={1000}>Semua</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((value) => value - 1)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-800 transition"
                  >
                    Sebelumnya
                  </button>

                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((value) => value + 1)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-800 transition"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Modal Pengaturan Domain Publik RSVP */}
      {isDomainModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                Domain Publik RSVP
              </h3>
              <button
                type="button"
                onClick={() => setIsDomainModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Domain ini akan digunakan saat menyalin Link RSVP dan mengekspor Excel untuk klien, agar link dapat dibuka di ponsel tamu dari luar jaringan:
            </p>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Base URL / Domain
              </label>
              <input
                type="text"
                value={tempOrigin}
                onChange={(e) => setTempOrigin(e.target.value)}
                placeholder="https://southern-fixtures-heel-precipitation.trycloudflare.com"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-cyan-300 focus:border-cyan-400 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Contoh: <code className="text-cyan-400">https://namadomain.com</code> atau URL Cloudflare Tunnel.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDomainModalOpen(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={savePublicOrigin}
                className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300"
              >
                Simpan Domain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wa Blast Modal */}
      <WaBlastModal
        isOpen={isWaModalOpen}
        onClose={() => {
          setIsWaModalOpen(false)
          void loadData()
        }}
        participants={filteredParticipants}
        visibleParticipants={visibleParticipants}
        currentPage={page}
        pageSize={pageSize}
      />

      {/* Daily Report Modal */}
      <DailyReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false)
          void loadData()
        }}
        participants={participants}
      />

      {/* Modal Kontrol Status RSVP */}
      <RsvpControlModal
        isOpen={isRsvpModalOpen}
        onClose={() => setIsRsvpModalOpen(false)}
        settings={rsvpSettings}
        onUpdate={(newSettings) => {
          setRsvpSettings(newSettings)
        }}
        publicOrigin={publicOrigin}
        showToast={showToast}
      />
    </main>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: number
  sub?: string
  tone: 'white' | 'emerald' | 'cyan' | 'amber' | 'purple'
}) {
  const tones = {
    white: 'text-white border-white/10 bg-white/[0.04]',
    emerald: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/[0.05]',
    cyan: 'text-cyan-300 border-cyan-500/20 bg-cyan-500/[0.05]',
    amber: 'text-amber-300 border-amber-500/20 bg-amber-500/[0.05]',
    purple: 'text-purple-300 border-purple-500/20 bg-purple-500/[0.05]',
  }

  return (
    <div className={`rounded-3xl border p-5 ${tones[tone]} space-y-1`}>
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-3xl font-black">{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  )
}

function ParticipantTableRow({
  participant,
  number,
  isSelected,
  isCopied,
  onToggleSelect,
  onToggleJalur,
  onCopyLink,
  onMarkWaSent,
  onView,
}: {
  participant: Participant
  lastLogTime?: string
  number: number
  isSelected: boolean
  isCopied: boolean
  onToggleSelect: (id: number) => void
  onToggleJalur: (participant: Participant) => void
  onCopyLink: (participant: Participant) => void
  onMarkWaSent: (participant: Participant) => void
  onView: (participant: Participant) => void
}) {
  const isManual = participant.jalur_undangan === 'manual'

  return (
    <tr
      className={`border-b border-white/5 transition hover:bg-white/[0.03] ${
        isSelected ? 'bg-cyan-950/20' : ''
      }`}
    >
      {/* Checkbox */}
      <td className="px-3 py-4 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(participant.id)}
          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-cyan-400 cursor-pointer"
        />
      </td>

      <td className="px-3 py-4 text-slate-500 text-xs font-mono">{number}</td>

      {/* Info Tamu */}
      <td className="px-4 py-4 font-medium text-white">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold">{participant.name}</span>

          {/* Badge WA Status */}
          {participant.wa_status === 'sent' ? (
            <span
              className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30"
              title={
                participant.waktu_kirim_wa
                  ? `Undangan WA terkirim: ${new Date(participant.waktu_kirim_wa).toLocaleString('id-ID')}`
                  : 'Undangan WA Terkirim'
              }
            >
              WA Terkirim
            </span>
          ) : (
            <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-500 border border-slate-700/40">
              WA Belum
            </span>
          )}

          {/* Badge RSVP Status */}
          {participant.rsvp_status === 'confirmed' ? (
            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/20">
              RSVP Hadir
            </span>
          ) : participant.rsvp_status === 'declined' ? (
            <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
              RSVP Batal
            </span>
          ) : (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
              Menunggu RSVP
            </span>
          )}

          {/* Badge Souvenir Status */}
          {participant.souvenir_status === 'claimed' || participant.waktu_souvenir ? (
            <span
              className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30"
              title={
                participant.waktu_souvenir
                  ? `Souvenir diambil: ${new Date(participant.waktu_souvenir).toLocaleString('id-ID')}`
                  : 'Souvenir Sudah Diambil'
              }
            >
              🎁 Souvenir Diambil
            </span>
          ) : (
            <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-500 border border-slate-700/40">
              🎁 Belum Ambil
            </span>
          )}
        </div>

        <p className="mt-1 text-xs font-normal text-slate-500">
          <span className="font-mono text-cyan-400/80">{participant.id_registrasi}</span>
          {participant.pekerjaan ? ` • ${participant.pekerjaan}` : ''}
          {participant.notelp ? ` • 📞 ${participant.notelp}` : ''}
        </p>
      </td>

      {/* Jalur Undangan */}
      <td className="px-3 py-4">
        <button
          type="button"
          onClick={() => onToggleJalur(participant)}
          title="Klik untuk beralih antara VIP Manual Klien dan Blast Sistem"
          className={`group inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold border transition active:scale-95 ${
            isManual
              ? 'border-purple-500/40 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25'
              : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
          }`}
        >
          {isManual ? 'VIP Manual' : 'Blast Sistem'}
        </button>
      </td>

      {/* Kehadiran Venue Gate */}
      <td className="px-3 py-4">
        <span
          className={
            participant.status
              ? 'rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs font-medium text-cyan-300'
              : 'rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300'
          }
        >
          {participant.status ? 'Hadir' : 'Belum validasi'}
        </span>
      </td>

      {/* Kolom Aksi Cepat */}
      <td className="px-4 py-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {/* Tombol Salin Link RSVP */}
          <button
            type="button"
            onClick={() => onCopyLink(participant)}
            title="Salin Link Konfirmasi RSVP Tamu ini"
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition active:scale-95 ${
              isCopied
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400 hover:text-cyan-300 whitespace-nowrap'
            }`}
          >
            {isCopied ? 'Disalin' : 'Salin Link'}
          </button>


          {/* Tombol Tandai Terkirim Manual jika belum */}
          {participant.wa_status !== 'sent' && (
            <button
              type="button"
              onClick={() => onMarkWaSent(participant)}
              title="Tandai undangan ini sudah dikirim manual oleh klien"
              className="rounded-lg border border-slate-700 px-2 py-1.5 text-[11px] font-medium text-slate-400 hover:border-emerald-500 hover:text-emerald-300 transition"
            >
              Tandai
            </button>
          )}

          {/* Tombol Lihat Detail */}
          <button
            type="button"
            onClick={() => onView(participant)}
            className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Detail
          </button>
        </div>
      </td>
    </tr>
  )
}
