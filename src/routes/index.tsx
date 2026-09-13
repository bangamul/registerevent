import { useNavigate } from '@tanstack/react-router'

export function HomePage() {
  const navigate = useNavigate()

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-3xl text-center">
        {/* Brand */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
            <span className="text-2xl font-black text-slate-950">T</span>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
          Event Registrasi
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-slate-400">
          Sistem registrasi dan kehadiran peserta acara.
          <br className="hidden sm:block" />
          Cepat, sederhana, dan terintegrasi.
        </p>

        {/* Main card */}
        <div className="mx-auto mt-10 max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
              <svg
                className="h-7 w-7 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 4.5v3m0-3h3m13.5 0v3m0-3h-3m-13.5 12v-3m0 3h3m13.5 0v-3m0 3h-3M7.5 7.5h3v3h-3v-3Zm6 6h3v3h-3v-3Zm0-6h3v3h-3v-3Zm-6 6h3v3h-3v-3Z"
                />
              </svg>
            </div>

            <h2 className="mt-5 text-xl font-semibold text-white">
              Scan QR Code
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Scan QR Code peserta untuk menampilkan data dan melakukan
              registrasi kehadiran.
            </p>

            <button
              type="button"
              onClick={() => navigate({ to: '/login' })}
              className="mt-7 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 active:scale-[0.98]"
            >
              Mulai Registrasi
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-slate-600">
          Event Registration & Attendance System
        </p>
      </div>
    </section>
  )
}