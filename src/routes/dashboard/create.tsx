import { useState, useRef } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { createParticipant } from './data'

export function CreatePage() {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // Berhasil, arahkan ke detail peserta baru
      navigate({
        to: '/dashboard/detail/$idRegistrasi',
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:px-10">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Tambah Peserta Baru
          </h1>
          <p className="mt-2 text-slate-400">
            Isikan data lengkap peserta untuk didaftarkan ke dalam sistem.
          </p>
        </div>

        {/* Form Container */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl sm:p-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Input Foto Peserta */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                Foto Peserta (Opsional)
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handlePhotoSelect}
              />

              <div className="flex items-center gap-5">
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview Foto"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <svg
                      className="h-8 w-8 text-slate-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-fit rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-300 transition"
                  >
                    {photoPreview ? 'Ubah Foto' : 'Pilih Foto'}
                  </button>

                  {photoPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="w-fit text-xs text-red-400 hover:underline"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Nama Lengkap */}
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-medium uppercase tracking-wider text-slate-400"
              >
                Nama Lengkap <span className="text-cyan-400">*</span>
              </label>
              <input
                id="name"
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder=""
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* No Telepon */}
            <div>
              <label
                htmlFor="notelp"
                className="block text-xs font-medium uppercase tracking-wider text-slate-400"
              >
                No. Telepon <span className="text-cyan-400">*</span>
              </label>
              <input
                id="notelp"
                type="text"
                name="notelp"
                required
                value={formData.notelp}
                onChange={handleChange}
                placeholder=""
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium uppercase tracking-wider text-slate-400"
              >
                Email (Opsional)
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder=""
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Pekerjaan */}
            <div>
              <label
                htmlFor="pekerjaan"
                className="block text-xs font-medium uppercase tracking-wider text-slate-400"
              >
                Pekerjaan / Instansi (Opsional)
              </label>
              <input
                id="pekerjaan"
                type="text"
                name="pekerjaan"
                value={formData.pekerjaan}
                onChange={handleChange}
                placeholder=""
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Gate */}
            <div>
              <label
                htmlFor="pekerjaan"
                className="block text-xs font-medium uppercase tracking-wider text-slate-400"
              >
                Gate
              </label>
              <select
                name="gate"
                value={formData.gate}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value="1">Gate 1</option>
                <option value="2">Gate 2</option>
                <option value="3">Gate 3</option>
                <option value="4">Gate 4</option>
                <option value="5">Gate 5</option>
              </select>
            </div>

            {/* Role Permission */}
            <div>
              <label
                htmlFor="pekerjaan"
                className="block text-xs font-medium uppercase tracking-wider text-slate-400"
              >
                Role Permission
              </label>
              <select
                name="role_permission"
                value={formData.role_permission}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value="1">Role 1</option>
                <option value="2">Role 2</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
              <Link
                to="/dashboard"
                className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-center text-sm font-medium text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
              >
                Batal
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Peserta'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}