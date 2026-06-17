import { motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const navLinks = [
  { href: '#overview', label: 'نظرة عامة' },
  { href: '#diagrams', label: 'المخططات' },
  { href: '#database', label: 'قاعدة البيانات' },
  { href: '#architecture', label: 'المعمارية' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-white/10 bg-slate-950/80 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <a href="#" className="flex items-center gap-2 text-sm font-semibold tracking-wide text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold">
            SP
          </span>
          نظام المواقف الذكي
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm text-slate-300 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#diagrams"
          className="hidden rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500 md:inline-flex"
        >
          عرض المخططات
        </a>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-300 hover:bg-white/5 md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="فتح القائمة"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-white/10 bg-slate-950/95 px-6 py-4 md:hidden"
        >
          <ul className="space-y-3">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block text-sm text-slate-300"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.header>
  )
}
