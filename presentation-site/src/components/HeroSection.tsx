import { motion } from 'framer-motion'
import { ArrowDown, Sparkles } from 'lucide-react'

const techStack = [
  { name: 'Python', abbr: 'Py', color: 'from-yellow-400 to-blue-500' },
  { name: 'FastAPI', abbr: 'API', color: 'from-emerald-400 to-teal-500' },
  { name: 'React', abbr: 'R', color: 'from-cyan-400 to-blue-500' },
  { name: 'PostgreSQL', abbr: 'PG', color: 'from-blue-400 to-indigo-500' },
  { name: 'Redis', abbr: 'Rd', color: 'from-rose-400 to-red-500' },
  { name: 'Docker', abbr: 'Dk', color: 'from-sky-400 to-blue-600' },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
}

export function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden section-padding pt-32">
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative mx-auto max-w-5xl text-center"
      >
        <motion.div
          variants={item}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-medium text-brand-200"
        >
          <Sparkles size={14} />
          مشروع التخرج · المناقشة الجامعية
        </motion.div>

        <motion.h1
          variants={item}
          className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-7xl"
        >
          نظام المواقف
          <span className="block gradient-text">الذكي</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 md:text-xl"
        >
          نظام إدارة وحجز مواقف ذكي في الوقت الفعلي — مبني على معمارية موجهة بالأحداث،
          معالجة خلفية، وتحديثات WebSocket لحظية.
        </motion.p>

        <motion.div variants={item} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#diagrams"
            className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-500"
          >
            استكشف المعمارية
          </a>
          <a
            href="#architecture"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5"
          >
            تدفق البيانات
          </a>
        </motion.div>

        <motion.div
          variants={item}
          className="mt-16 flex flex-wrap items-center justify-center gap-4 md:gap-6"
        >
          {techStack.map((tech, index) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + index * 0.1, type: 'spring', stiffness: 200 }}
              whileHover={{ y: -4, scale: 1.05 }}
              className="group flex flex-col items-center gap-2"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${tech.color} text-sm font-bold text-white shadow-lg transition group-hover:shadow-xl`}
              >
                {tech.abbr}
              </div>
              <span className="text-xs font-medium text-slate-500 group-hover:text-slate-300">
                {tech.name}
              </span>
            </motion.div>
          ))}
        </motion.div>

        <motion.a
          variants={item}
          href="#overview"
          className="mt-20 inline-flex flex-col items-center gap-2 text-slate-500 transition hover:text-slate-300"
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <span className="text-xs uppercase tracking-widest">مرّر للأسفل</span>
          <ArrowDown size={18} />
        </motion.a>
      </motion.div>
    </section>
  )
}
