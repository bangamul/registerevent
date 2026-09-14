import { useState, useRef } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { createParticipant } from './data'

export function LandingPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    notelp: '',
    email: '',
    pekerjaan: '',
    gate: '1',
    role_permission: '1',
  })
  const [foto, setFoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFoto(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleRemovePhoto = () => {
    setFoto(null)
    setPhotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.notelp.trim()) {
      setError('Nama dan Nomor Telepon wajib diisi.')
      return
    }

    try {
      setLoading(true)
      setError('')

      const newParticipant = await createParticipant({
        ...formData,
        foto,
      })

      // Reset form fields setelah sukses
      setFormData({
        name: '',
        notelp: '',
        email: '',
        pekerjaan: '',
        gate: '1',
        role_permission: '1',
      })
      setFoto(null)
      setPhotoPreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      navigate({
        to: '/landing',
        params: { idRegistrasi: newParticipant.id_registrasi },
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal menambahkan peserta.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
      {/* Dynamic Background Glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-[-10%] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[10%] h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            <span>✨</span> Event Portal
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl pt-8">
            Registrasi Peserta
          </h1>
          <p className="mx-auto max-w-md text-sm text-slate-400 sm:text-base">
            Lengkapi data diri di bawah ini untuk mendapatkan akses masuk ke acara.
          </p>
        </div>

        {/* Main Card Container */}
        <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/45 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Upload Foto - Modern Minimalist Avatar Upload */}
            <div className="flex flex-col sm:flex-row items-center gap-6 rounded-2xl border border-white/5 bg-slate-950/40 p-5">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                disabled={loading}
                onChange={handlePhotoSelect}
              />
              
              <div 
                onClick={() => !loading && fileInputRef.current?.click()}
                className={`group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-700 bg-slate-900 transition ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-cyan-400'
                }`}
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <svg className="h-6 w-6 text-slate-500 group-hover:text-cyan-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                )}
                {!loading && (
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[10px] font-medium text-cyan-300">
                    Ubah
                  </div>
                )}
              </div>

              <div className="text-center sm:text-left space-y-1">
                <h3 className="text-sm font-medium text-white">Foto Profil</h3>
                <p className="text-xs text-slate-400">Format: PNG, JPG, atau WEBP. Maksimal ukuran standar.</p>
                {photoPreview && !loading && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-xs text-red-400 hover:text-red-300 transition mt-1 block"
                  >
                    Hapus foto terpilih
                  </button>
                )}
              </div>
            </div>

            {/* Inputs Group */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-xs font-medium text-slate-300">
                  Nama Lengkap <span className="text-cyan-400">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  required
                  disabled={loading}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="cth: Satria Bagus"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-600 transition focus:border-cyan-400 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="notelp" className="text-xs font-medium text-slate-300">
                  No. Telepon <span className="text-cyan-400">*</span>
                </label>
                <input
                  id="notelp"
                  type="text"
                  name="notelp"
                  required
                  disabled={loading}
                  value={formData.notelp}
                  onChange={handleChange}
                  placeholder="cth: 0812345678"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-600 transition focus:border-cyan-400 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-slate-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  disabled={loading}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="nama@domain.com"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-600 transition focus:border-cyan-400 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pekerjaan" className="text-xs font-medium text-slate-300">
                  Pekerjaan / Instansi
                </label>
                <input
                  id="pekerjaan"
                  type="text"
                  name="pekerjaan"
                  disabled={loading}
                  value={formData.pekerjaan}
                  onChange={handleChange}
                  placeholder="cth: Software Engineer"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-600 transition focus:border-cyan-400 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Actions Button */}
            <div className="pt-4 flex items-center justify-center gap-3">
              <Link
                to="/dashboard"
                className="hidden rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Kembali
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center w-full justify-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    Memproses...
                  </>
                ) : (
                  'Daftar Sekarang'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-600">
          Event Registration & Attendance System • Secure & Encrypted
        </p>
      </div>
    </main>
  )
}
