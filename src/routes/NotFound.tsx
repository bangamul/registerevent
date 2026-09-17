import { Link } from '@tanstack/react-router'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-white relative overflow-hidden">
      {/* Aesthetic Background Elements */}
      <div className="pointer-events-none absolute left-0 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-0 h-96 w-96 translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px]" />

      <section className="relative z-10 w-full max-w-lg rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-10 text-center shadow-[0_0_80px_rgba(34,211,238,0.05)] backdrop-blur-xl sm:p-14">
        
        {/* Animated 404 */}
        <h1 className="text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-500 drop-shadow-2xl sm:text-8xl animate-pulse">
          404
        </h1>
        
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
          Page Not Found
        </p>
        
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-100">
          Halaman Kosong
        </h2>
        
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          Ups! Anda sepertinya tersesat. Halaman yang Anda coba akses tidak dapat ditemukan atau telah dipindahkan.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/"
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-cyan-500/20 transition-all hover:scale-[1.02] hover:bg-cyan-300 hover:shadow-cyan-500/40 active:scale-[0.98] sm:w-auto"
          >
            Halaman Utama
          </Link>
        </div>
      </section>
    </main>
  )
}
