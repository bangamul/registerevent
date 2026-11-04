import { useEffect, useMemo, useState } from 'react'
import type { Participant } from '../routes/dashboard/data'
import {
  fetchBlastStatus,
  fetchWaStatus,
  logoutWa,
  sendTestWa,
  startBlast,
  stopBlast,
  getWaBaseUrl,
  type BlastStatus,
  type WaStatusResponse,
} from '../api/wa'

interface WaBlastModalProps {
  isOpen: boolean
  onClose: () => void
  participants: Participant[]
  visibleParticipants?: Participant[]
  currentPage?: number
  pageSize?: number
}

const DEFAULT_TEMPLATE = `Kepada Yth.
*{{name}}*

Dengan hormat kami mengundang Anda untuk hadir pada acara:

*PELUNCURAN BUKU: TIMAH, MANUSIA, DAN MASA DEPAN*
_Menata Ulang Arah Pembangunan Hijau dan Digital_

📅 *Hari/Tanggal:* Senin, 9 November 2026
⏰ *Waktu:* 15.00 - 19.00 WIB
📍 *Tempat:* Sumba Room, Hotel Borobudur Jakarta

Mohon lakukan konfirmasi kehadiran & pengambilan E-Ticket QR Code Anda melalui tautan resmi di bawah ini:
🔗 {{url_registrasi}}

⚠️ *Catatan Keamanan:*
- Tautan di atas terikat khusus dengan nomor WhatsApp Anda.
- Tautan hanya dapat digunakan 1 (satu) kali untuk menerbitkan E-Ticket QR Code.
- Simpan QR Code yang diterbitkan untuk ditunjukkan kepada petugas saat masuk di lokasi acara.

Terima kasih atas perhatian dan kehadiran Bapak/Ibu.

Salam hormat,
*Panitia Penyelenggara*`

export function WaBlastModal({
  isOpen,
  onClose,
  participants,
  visibleParticipants = [],
  currentPage = 1,
  pageSize = 25,
}: WaBlastModalProps) {
  const [activeTab, setActiveTab] = useState<'koneksi' | 'pesan' | 'kirim'>('pesan')
  const [waStatus, setWaStatus] = useState<WaStatusResponse | null>(null)
  const [serviceError, setServiceError] = useState(false)
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [sendFlyer, setSendFlyer] = useState(true)
  const [webBaseUrl, setWebBaseUrl] = useState(() => {
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
  })
  
  // Target scope state: 'page' (per 20/25 data) | 'all' (semua data) | 'unconfirmed'
  const [targetScope, setTargetScope] = useState<'page' | 'all' | 'unconfirmed'>('page')

  // Test send state
  const [testPhone, setTestPhone] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string } | null>(null)

  // Blast process state
  const [blastData, setBlastData] = useState<BlastStatus | null>(null)
  const [startingBlast, setStartingBlast] = useState(false)
  const [blastFeedback, setBlastFeedback] = useState<{ success: boolean; message: string } | null>(null)

  // Anti-ban configuration
  const [minDelay, setMinDelay] = useState(7)
  const [maxDelay, setMaxDelay] = useState(14)
  const [batchSize, setBatchSize] = useState(25)
  const [batchPauseMinutes, setBatchPauseMinutes] = useState(2)

  // Proteksi khusus: Jangan blast VIP Manual Klien
  const [excludeManual, setExcludeManual] = useState(true)

  // Filter participants based on selected target scope
  const validParticipants = useMemo(() => {
    let list = participants
    if (excludeManual) {
      list = list.filter((p) => p.jalur_undangan !== 'manual')
    }
    if (targetScope === 'page' && visibleParticipants && visibleParticipants.length > 0) {
      list = visibleParticipants.filter((p) => !excludeManual || p.jalur_undangan !== 'manual')
    } else if (targetScope === 'unconfirmed') {
      list = list.filter((p) => p.rsvp_status !== 'confirmed')
    }
    return list.filter((p) => p.notelp && p.notelp.trim().length >= 8)
  }, [participants, visibleParticipants, targetScope, excludeManual])

  // Poll WA Status every 3 seconds while modal is open
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true

    async function checkStatus() {
      try {
        const res = await fetchWaStatus()
        if (isMounted) {
          setWaStatus(res)
          setServiceError(false)
          if (!res.connected && activeTab === 'kirim') {
            setActiveTab('koneksi')
          }
        }
      } catch {
        if (isMounted) {
          setServiceError(true)
          setWaStatus(null)
        }
      }
    }

    void checkStatus()
    const timer = setInterval(() => {
      void checkStatus()
    }, 3000)

    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [isOpen, activeTab])

  // Poll Blast Progress every 1.5 seconds if blast is active or modal is on tab kirim
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true

    async function checkBlast() {
      try {
        const res = await fetchBlastStatus()
        if (isMounted) {
          setBlastData(res.data)
          if (res.data.isRunning && activeTab !== 'kirim') {
            setActiveTab('kirim')
          }
        }
      } catch {
        // ignore background poll errors
      }
    }

    void checkBlast()
    const interval = setInterval(() => {
      void checkBlast()
    }, 1500)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [isOpen, activeTab])

  // Preview data using the first valid participant
  const previewMessage = useMemo(() => {
    const sample = validParticipants[0] || {
      name: 'Bpk. Hendra Gunawan',
      id_registrasi: 'REG-2026-001',
      notelp: '081234567890',
      role_permission: '1',
      gate: '1',
      pekerjaan: 'Kementerian ESDM',
    }

    // Dummy base64url token for preview
    const cleanBase = (webBaseUrl || 'http://localhost:5173').replace(/\/$/, '')
    const sampleUrl = `${cleanBase}/landing`

    let text = template
    text = text.replace(/{{\s*(url_registrasi|link_registrasi)\s*}}/gi, sampleUrl)
    text = text.replace(/{{\s*(name|nama)\s*}}/gi, sample.name || '')
    text = text.replace(/{{\s*id_registrasi\s*}}/gi, sample.id_registrasi || '')
    text = text.replace(/{{\s*notelp\s*}}/gi, sample.notelp || '')
    text = text.replace(/{{\s*(sesi|role_permission)\s*}}/gi, sample.role_permission ? `Sesi ${sample.role_permission}` : 'Sesi 1')
    text = text.replace(/{{\s*gate\s*}}/gi, sample.gate ? `Gate ${sample.gate}` : 'Gate 1')
    return text
  }, [template, validParticipants, webBaseUrl])

  function insertTag(tag: string) {
    setTemplate((prev) => `${prev} {{${tag}}}`)
  }

  async function handleLogout() {
    if (!confirm('Apakah Anda yakin ingin memutuskan koneksi WhatsApp saat ini?')) return
    try {
      await logoutWa()
      const res = await fetchWaStatus()
      setWaStatus(res)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal logout WhatsApp')
    }
  }

  async function handleTestSend() {
    if (!testPhone.trim()) {
      setTestFeedback({ success: false, message: 'Masukkan nomor WhatsApp Anda untuk uji coba.' })
      return
    }

    try {
      setTestLoading(true)
      setTestFeedback(null)

      const cleanBase = (webBaseUrl || 'http://localhost:5173').replace(/\/$/, '')
      const testUrl = `${cleanBase}/landing`

      let compiledTestMessage = template
      compiledTestMessage = compiledTestMessage.replace(/{{\s*(url_registrasi|link_registrasi)\s*}}/gi, testUrl)
      compiledTestMessage = compiledTestMessage.replace(/{{\s*(name|nama)\s*}}/gi, 'Tamu Uji Coba')
      compiledTestMessage = compiledTestMessage.replace(/{{\s*id_registrasi\s*}}/gi, 'REG-TEST-001')
      compiledTestMessage = compiledTestMessage.replace(/{{\s*notelp\s*}}/gi, testPhone.trim())
      compiledTestMessage = compiledTestMessage.replace(/{{\s*(sesi|role_permission)\s*}}/gi, 'Sesi 1')
      compiledTestMessage = compiledTestMessage.replace(/{{\s*gate\s*}}/gi, 'Gate 1')

      const res = await sendTestWa(testPhone.trim(), compiledTestMessage, sendFlyer, webBaseUrl)
      setTestFeedback({ success: res.success, message: res.message })
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : err instanceof Error
        ? err.message
        : 'Gagal mengirim pesan uji coba'
      setTestFeedback({ success: false, message: msg || 'Gagal mengirim pesan uji coba' })
    } finally {
      setTestLoading(false)
    }
  }

  async function handleStartBlast() {
    if (!waStatus?.connected) {
      setActiveTab('koneksi')
      alert('Sambungkan WhatsApp terlebih dahulu dengan scan QR code.')
      return
    }

    if (validParticipants.length === 0) {
      alert('Tidak ada peserta dengan nomor telepon valid untuk dikirim.')
      return
    }

    const confirmMsg = `Mulai blast pesan ke ${validParticipants.length} peserta?\n\nKirim Gambar Flyer: ${sendFlyer ? 'YA' : 'TIDAK'}\nPengiriman akan menerapkan jeda acak ${minDelay}-${maxDelay} detik dan jeda istirahat berkala untuk mencegah pemblokiran nomor.`
    if (!confirm(confirmMsg)) return

    try {
      setStartingBlast(true)
      setBlastFeedback(null)
      const res = await startBlast({
        messageTemplate: template,
        participants: validParticipants,
        minDelay: minDelay * 1000,
        maxDelay: maxDelay * 1000,
        batchSize,
        batchPauseMs: batchPauseMinutes * 60 * 1000,
        sendFlyer,
        webBaseUrl,
      })
      setBlastFeedback({ success: true, message: res.message })
      setActiveTab('kirim')
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : err instanceof Error
        ? err.message
        : 'Gagal memulai blast'
      setBlastFeedback({ success: false, message: msg || 'Gagal memulai blast' })
    } finally {
      setStartingBlast(false)
    }
  }

  async function handleStopBlast() {
    if (!confirm('Apakah Anda yakin ingin menghentikan pengiriman blast ini sekarang?')) return
    try {
      await stopBlast()
      const res = await fetchBlastStatus()
      setBlastData(res.data)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menghentikan blast')
    }
  }

  if (!isOpen) return null

  const isConnected = waStatus?.connected
  const isRunning = blastData?.isRunning
  const total = blastData?.total || validParticipants.length || 1
  const sent = blastData?.sent || 0
  const progressPercent = Math.min(100, Math.round((sent / total) * 100))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.83a8.19 8.19 0 01-5.82 2.41h-.01c-1.46 0-2.88-.38-4.14-1.11l-.3-.17-3.12.82.83-3.04-.19-.31a8.16 8.16 0 01-1.25-4.43c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.98-.14.17-.29.19-.54.06-.25-.13-1.07-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.41 1.44.53.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.2-.59.2-1.09.14-1.19-.06-.1-.23-.17-.48-.29z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Broadcast WhatsApp Undangan</h2>
              <p className="text-xs text-slate-400">
                Kirim undangan resmi & link registrasi QR ke {validParticipants.length} tamu undangan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {serviceError ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                Service Offline
              </span>
            ) : isConnected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {waStatus?.user?.name || waStatus?.user?.id || 'WA Terhubung'}
              </span>
            ) : (
              <button
                onClick={() => setActiveTab('koneksi')}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 hover:bg-amber-500/20"
              >
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                Perlu Scan QR
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6">
          <button
            onClick={() => setActiveTab('pesan')}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'pesan'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Template Pesan & Gambar
          </button>
          <button
            onClick={() => setActiveTab('koneksi')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'koneksi'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Koneksi WhatsApp
            {isConnected ? (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('kirim')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'kirim'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Pengiriman & Progres
            {isRunning && (
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: KONEKSI WHATSAPP */}
          {activeTab === 'koneksi' && (
            <div className="space-y-6">
              {serviceError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-center text-rose-300">
                  <h3 className="text-base font-bold text-rose-400">WhatsApp Service Belum Berjalan</h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Buka terminal baru di direktori project ini dan jalankan perintah:
                  </p>
                  <code className="mt-3 inline-block rounded-xl bg-slate-950 px-4 py-2 font-mono text-sm text-cyan-400 border border-slate-800">
                    npm run wa
                  </code>
                  <p className="mt-2 text-xs text-slate-400">
                    Setelah service aktif di port 5001, status akan otomatis terhubung.
                  </p>
                </div>
              ) : isConnected ? (
                <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">WhatsApp Siap Digunakan</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Terhubung sebagai <span className="font-semibold text-emerald-400">{waStatus?.user?.name || 'Admin'}</span> ({waStatus?.user?.id})
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                      onClick={() => setActiveTab('pesan')}
                      className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
                    >
                      Lanjut Atur Pesan &rarr;
                    </button>
                    <button
                      onClick={handleLogout}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/20"
                    >
                      Ganti Nomor / Logout
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 items-center">
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-950 p-6">
                    {waStatus?.qr ? (
                      <div className="rounded-2xl bg-white p-3 shadow-xl">
                        <img src={waStatus.qr} alt="Scan QR WhatsApp" className="h-56 w-56 object-contain" />
                      </div>
                    ) : (
                      <div className="flex h-56 w-56 flex-col items-center justify-center text-slate-400">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent mb-3" />
                        <span className="text-sm">Menyiapkan QR Code...</span>
                      </div>
                    )}
                    <p className="mt-4 text-xs text-slate-400 text-center">
                      Atau buka di browser HP:{' '}
                      <a
                        href={`${getWaBaseUrl()}/qr`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 underline"
                      >
                        {getWaBaseUrl()}/qr
                      </a>
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">Cara Menghubungkan WhatsApp Panitia:</h3>
                    <ol className="space-y-3 text-sm text-slate-300">
                      <li className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 font-bold text-cyan-400 text-xs">
                          1
                        </span>
                        <span>Buka WhatsApp di ponsel panitia.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 font-bold text-cyan-400 text-xs">
                          2
                        </span>
                        <span>
                          Masuk ke menu <b>Perangkat Tertaut</b> (Linked Devices).
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 font-bold text-cyan-400 text-xs">
                          3
                        </span>
                        <span>
                          Pilih <b>Tautkan Perangkat</b> lalu scan QR Code di samping.
                        </span>
                      </li>
                    </ol>

                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
                      <b>Tips Anti-Blokir:</b> Gunakan nomor WhatsApp yang sudah aktif dipakai harian (bukan nomor kartu perdana baru beli).
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TULIS PESAN, GAMBAR, & TEST SEND */}
          {activeTab === 'pesan' && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Kolom Kiri: Editor Pesan & Pengaturan Gambar */}
              <div className="space-y-4">
                {/* Opsi Lampiran Gambar Flyer */}
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendFlyer}
                        onChange={(e) => setSendFlyer(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                      />
                      <span className="text-sm font-bold text-white">
                        Sertakan Gambar Undangan (Flyer Buku)
                      </span>
                    </label>
                    <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
                      Peluncuran Buku Timah
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400 pl-7">
                    Pesan akan dikirim sebagai media foto dengan caption teks undangan dan link pendaftaran di bawahnya.
                  </p>
                </div>

                {/* Domain URL Setting */}
                <div>
                  <label className="text-xs font-semibold text-slate-400">
                    Host / Domain Web Pendaftaran (Untuk generate <code className="text-cyan-400 font-mono">{"{{url_registrasi}}"}</code>)
                  </label>
                  <input
                    type="text"
                    value={webBaseUrl}
                    onChange={(e) => setWebBaseUrl(e.target.value)}
                    placeholder="http://localhost:5173 atau http://192.168.10.1:5173"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-cyan-300 focus:border-cyan-400 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Gunakan IP LAN panitia atau domain publik agar link dapat dibuka di ponsel peserta.
                  </p>
                </div>

                {/* Variabel Chips */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-400">Klik variabel untuk menyisipkan ke teks:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { tag: 'url_registrasi', label: '🔗 URL Registrasi Khusus (1x Pakai)', highlight: true },
                      { tag: 'name', label: 'Nama Tamu' },
                      { tag: 'id_registrasi', label: 'ID Tiket' },
                      { tag: 'gate', label: 'Gate' },
                      { tag: 'notelp', label: 'No. Telp' },
                    ].map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => insertTag(v.tag)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${
                          v.highlight
                            ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                            : 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                        }`}
                      >
                        +{`{{${v.tag}}}`}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={9}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="Ketik template pesan WhatsApp di sini..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />

                {/* Test Send Section */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Uji Coba Kirim ke Nomor Sendiri
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Kirim pesan tes beserta gambar dan link registrasi ke nomor panitia untuk memastikan hasil tampil rapi.
                  </p>
                  
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="08123456789..."
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={testLoading || !isConnected}
                      onClick={handleTestSend}
                      className="rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-50"
                    >
                      {testLoading ? 'Mengirim...' : 'Kirim Tes'}
                    </button>
                  </div>

                  {testFeedback && (
                    <p
                      className={`mt-2 text-xs font-medium ${
                        testFeedback.success ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {testFeedback.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Kolom Kanan: Live WhatsApp Preview */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-white mb-2">
                  Preview Tampilan di WhatsApp Penerima
                </label>
                <div className="flex-1 rounded-3xl border border-slate-800 bg-[#0b141a] p-4 text-slate-200 shadow-inner flex flex-col justify-end min-h-[380px]">
                  <div className="self-end max-w-[88%] rounded-2xl rounded-tr-none bg-[#005c4b] overflow-hidden text-sm text-white shadow-md">
                    {/* Flyer Image Preview inside WA Bubble */}
                    {sendFlyer && (
                      <div className="relative border-b border-black/10 bg-black/20">
                        <img
                          src="/invitation-v2.jpg"
                          alt="Flyer Acara"
                          className="w-full max-h-56 object-cover object-top"
                        />
                        <div className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] text-white">
                          Lampiran Gambar
                        </div>
                      </div>
                    )}

                    <div className="p-3.5 space-y-2">
                      <p className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm font-sans">{previewMessage}</p>
                      <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-200/80 pt-1">
                        <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        <svg className="h-3 w-3 fill-current" viewBox="0 0 16 15">
                          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setActiveTab('kirim')}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
                  >
                    Lanjut ke Pengaturan Kirim &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PENGIRIMAN & PROGRES */}
          {activeTab === 'kirim' && (
            <div className="space-y-6">
              {!isRunning && (
                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>🎯</span> Target Pengiriman Blast
                    </h3>
                    <span className="text-xs text-slate-400">
                      Dipilih: <b className="text-emerald-400 font-bold">{validParticipants.length} Peserta</b>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Pilih cakupan data peserta yang ingin Anda kirimkan pesan WhatsApp saat ini:
                  </p>

                  {/* Banner Proteksi VIP Manual */}
                  <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">🛡️</span>
                      <div>
                        <p className="text-xs font-semibold text-purple-200">
                          Proteksi Tamu VIP Klien ({participants.filter((p) => p.jalur_undangan === 'manual').length} Orang)
                        </p>
                        <p className="text-[11px] text-purple-300/80">
                          Peserta jalur VIP Manual otomatis dilindungi agar tidak terkirim blast sistem.
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-purple-200 shrink-0">
                      <input
                        type="checkbox"
                        checked={excludeManual}
                        onChange={(e) => setExcludeManual(e.target.checked)}
                        className="h-4 w-4 rounded border-purple-500 bg-slate-900 text-purple-500 focus:ring-purple-400"
                      />
                      <span>Kecualikan VIP</span>
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setTargetScope('page')}
                      className={`flex flex-col rounded-2xl border p-4 text-left transition ${
                        targetScope === 'page'
                          ? 'border-emerald-500 bg-emerald-500/15 text-white ring-1 ring-emerald-500/50'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-emerald-400">📄 Halaman Ini Saja</span>
                        {targetScope === 'page' && <span className="text-emerald-400 text-xs font-bold">✓ Aktif</span>}
                      </div>
                      <p className="mt-2 text-2xl font-black text-white">
                        {visibleParticipants ? visibleParticipants.filter((p) => p.notelp && p.notelp.trim().length >= 8).length : 0}
                        <span className="text-xs font-normal text-slate-400 ml-1">orang</span>
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Halaman {currentPage} (Tabel {pageSize} data)
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetScope('all')}
                      className={`flex flex-col rounded-2xl border p-4 text-left transition ${
                        targetScope === 'all'
                          ? 'border-cyan-500 bg-cyan-500/15 text-white ring-1 ring-cyan-500/50'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-cyan-400">👥 Semua Peserta</span>
                        {targetScope === 'all' && <span className="text-cyan-400 text-xs font-bold">✓ Aktif</span>}
                      </div>
                      <p className="mt-2 text-2xl font-black text-white">
                        {participants.filter((p) => p.notelp && p.notelp.trim().length >= 8).length}
                        <span className="text-xs font-normal text-slate-400 ml-1">orang</span>
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Seluruh database yang terfilter
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetScope('unconfirmed')}
                      className={`flex flex-col rounded-2xl border p-4 text-left transition ${
                        targetScope === 'unconfirmed'
                          ? 'border-amber-500 bg-amber-500/15 text-white ring-1 ring-amber-500/50'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-amber-400">⏳ Belum RSVP Saja</span>
                        {targetScope === 'unconfirmed' && <span className="text-amber-400 text-xs font-bold">✓ Aktif</span>}
                      </div>
                      <p className="mt-2 text-2xl font-black text-white">
                        {participants.filter((p) => p.rsvp_status !== 'confirmed' && p.notelp && p.notelp.trim().length >= 8).length}
                        <span className="text-xs font-normal text-slate-400 ml-1">orang</span>
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Follow-up yang belum konfirmasi
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {!isRunning && (
                <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Pengaman Anti-Blokir (Safe Queue Mode)
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Sistem akan mengirim pesan secara berkala dengan jeda acak menyerupai manusia agar aman dari deteksi bot Meta.
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <div>
                      <label className="text-xs text-slate-400">Jeda Min (Detik)</label>
                      <input
                        type="number"
                        min={5}
                        max={30}
                        value={minDelay}
                        onChange={(e) => setMinDelay(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Jeda Max (Detik)</label>
                      <input
                        type="number"
                        min={minDelay + 1}
                        max={45}
                        value={maxDelay}
                        onChange={(e) => setMaxDelay(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Batch Ukuran</label>
                      <input
                        type="number"
                        min={10}
                        max={50}
                        value={batchSize}
                        onChange={(e) => setBatchSize(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Jeda Istirahat Batch (Menit)</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={batchPauseMinutes}
                        onChange={(e) => setBatchPauseMinutes(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4 text-xs text-slate-400">
                    <span>
                      Target: <b>{validParticipants.length} Peserta</b> • Kirim Gambar: <b>{sendFlyer ? 'Aktif' : 'Tidak'}</b>
                    </span>
                    <span>
                      Estimasi durasi: ~{Math.round((validParticipants.length * ((minDelay + maxDelay) / 2) + (Math.floor(validParticipants.length / batchSize) * batchPauseMinutes * 60)) / 60)} Menit
                    </span>
                  </div>
                </div>
              )}

              {/* Action Start / Stop */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                {!isRunning ? (
                  <button
                    disabled={startingBlast || !isConnected || validParticipants.length === 0}
                    onClick={handleStartBlast}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-95 disabled:opacity-50"
                  >
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                    {startingBlast ? 'Memulai Pengiriman...' : `Mulai Blast (${validParticipants.length} Peserta)`}
                  </button>
                ) : (
                  <button
                    onClick={handleStopBlast}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-500 bg-rose-500/20 px-6 py-3.5 text-sm font-bold text-rose-300 hover:bg-rose-500/30"
                  >
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M6 6h12v12H6z" />
                    </svg>
                    Hentikan Pengiriman
                  </button>
                )}

                {blastFeedback && (
                  <span className={`text-sm ${blastFeedback.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {blastFeedback.message}
                  </span>
                )}
              </div>

              {/* Progress Bar & Counters */}
              {(isRunning || blastData) && (
                <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-white">
                      {isRunning ? 'Sedang Mengirim Pesan Undangan...' : 'Status Terakhir'}
                    </span>
                    <span className="text-cyan-400 font-bold">{progressPercent}%</span>
                  </div>

                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {blastData?.cooldownUntil && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 animate-pulse">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      Sedang istirahat jeda batch untuk mencegah blokir WhatsApp...
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
                    <div className="rounded-xl bg-slate-900 p-2.5 border border-slate-800">
                      <p className="text-slate-400">Total</p>
                      <p className="text-lg font-bold text-white">{blastData?.total || 0}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-500/10 p-2.5 border border-emerald-500/20">
                      <p className="text-emerald-400 font-medium">Terkirim</p>
                      <p className="text-lg font-bold text-emerald-400">{blastData?.sent || 0}</p>
                    </div>
                    <div className="rounded-xl bg-rose-500/10 p-2.5 border border-rose-500/20">
                      <p className="text-rose-400 font-medium">Gagal</p>
                      <p className="text-lg font-bold text-rose-400">{blastData?.failed || 0}</p>
                    </div>
                    <div className="rounded-xl bg-amber-500/10 p-2.5 border border-amber-500/20">
                      <p className="text-amber-400 font-medium">Dilewati</p>
                      <p className="text-lg font-bold text-amber-400">{blastData?.skipped || 0}</p>
                    </div>
                  </div>

                  {blastData?.logs && blastData.logs.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Riwayat Log Pengiriman
                      </h4>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-2xl border border-slate-800 bg-slate-900/50 p-2 font-mono text-xs">
                        {blastData.logs.map((log, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${
                              log.status === 'success'
                                ? 'text-emerald-400 bg-emerald-500/5'
                                : log.status === 'failed'
                                ? 'text-rose-400 bg-rose-500/5'
                                : log.status === 'cooldown'
                                ? 'text-amber-300 bg-amber-500/5'
                                : 'text-slate-400'
                            }`}
                          >
                            <span className="truncate max-w-[200px]">{log.name}</span>
                            <span className="text-slate-500">{log.phone}</span>
                            <span>{log.message}</span>
                            <span className="text-slate-600">{log.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-950/80 px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Node.js WhatsApp Engine • Baileys Multi-Device
          </p>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  )
}
