import { GraduationCap } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-slate-950 px-6 py-12 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-3 text-center md:text-right">
          <GraduationCap className="text-brand-400" size={24} />
          <div>
            <p className="font-semibold text-white">نظام المواقف الذكي</p>
            <p className="text-sm text-slate-500">
              مصطفى الديوب · موسى العوض — مشروع التخرج
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-600">
          FastAPI · React · PostgreSQL · Redis · Celery · Docker · WebSockets
        </p>
      </div>
    </footer>
  )
}
