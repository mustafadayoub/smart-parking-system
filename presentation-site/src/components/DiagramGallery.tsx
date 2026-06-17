import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2,
  Expand,
  FileImage,
  FileText,
  Layers,
  Maximize2,
  Network,
  Workflow,
  X,
  ZoomIn,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { categoryLabels, diagrams, type DiagramItem } from '../data/diagrams'
import { UseCaseScenarioPanel } from './UseCaseScenarioPanel'

const categoryIcons = {
  behavioral: Workflow,
  structural: Layers,
  'data-flow': Network,
  scenario: FileText,
}

function DiagramPreview({ diagram, onExpand }: { diagram: DiagramItem; onExpand: () => void }) {
  const [imgError, setImgError] = useState(false)
  const src = `/diagrams/${diagram.filename}`

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/60">
      {!imgError ? (
        <img
          src={src}
          alt={diagram.title}
          className="h-auto max-h-[420px] w-full cursor-zoom-in object-contain p-4 transition hover:opacity-90"
          onClick={onExpand}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-8 text-center">
          <FileImage className="text-slate-600" size={48} />
          <p className="text-sm text-slate-500">
            ضع الملف{' '}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-brand-300">{diagram.filename}</code>{' '}
            في{' '}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">public/diagrams/</code>
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onExpand}
        className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-lg bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-brand-600"
      >
        <Expand size={14} />
        ملء الشاشة
      </button>
    </div>
  )
}

function Lightbox({ diagram, onClose }: { diagram: DiagramItem; onClose: () => void }) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  const src = `/diagrams/${diagram.filename}`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-sm md:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative max-h-[95vh] max-w-6xl overflow-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-400">
              {categoryLabels[diagram.category]}
            </p>
            <h3 className="text-lg font-semibold text-white">{diagram.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-auto p-4 md:p-6">
          <img src={src} alt={diagram.title} className="mx-auto max-h-[75vh] w-full object-contain" />
        </div>

        <div className="border-t border-white/10 px-6 py-3 text-center text-xs text-slate-500">
          اضغط <kbd className="rounded bg-slate-800 px-1.5 py-0.5">Esc</kbd> أو انقر خارج الصورة
          للإغلاق · <ZoomIn size={12} className="inline" /> مرّر للتكبير
        </div>
      </motion.div>
    </motion.div>
  )
}

export function DiagramGallery() {
  const [activeId, setActiveId] = useState(diagrams[0].id)
  const [lightboxDiagram, setLightboxDiagram] = useState<DiagramItem | null>(null)

  const active = diagrams.find((d) => d.id === activeId) ?? diagrams[0]
  const CategoryIcon = categoryIcons[active.category]

  return (
    <section id="diagrams" className="section-padding border-t border-white/5 bg-slate-900/30">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 max-w-3xl"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">
            معرض UML و DFD
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">عرض المخططات المعمارية</h2>
          <p className="mt-4 text-lg text-slate-400">
            أحد عشر مخططاً وسيناريواً رسمياً بالترتيب الأكademي — BFD، DFD، Use Cases،
            السيناريوهات، Activity Diagrams، ومخطط الأصناف.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <motion.nav
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
          >
            {diagrams.map((diagram) => {
              const Icon = categoryIcons[diagram.category]
              const isActive = diagram.id === activeId
              return (
                <button
                  key={diagram.id}
                  type="button"
                  onClick={() => setActiveId(diagram.id)}
                  className={`flex shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-right text-sm transition lg:w-full ${
                    isActive
                      ? 'border-brand-500/50 bg-brand-500/15 text-white'
                      : 'border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-slate-200'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-brand-300' : 'text-slate-500'} />
                  <span className="font-medium">{diagram.shortTitle}</span>
                </button>
              )
            })}
          </motion.nav>

          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="glass-panel overflow-hidden"
            >
              <div className="border-b border-white/10 px-6 py-5 md:px-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                      <CategoryIcon size={12} />
                      {categoryLabels[active.category]}
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-white md:text-2xl">{active.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLightboxDiagram(active)}
                    disabled={active.kind !== 'svg'}
                    className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-brand-500/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Maximize2 size={14} />
                    {active.kind === 'svg' ? 'فتح بملء الشاشة' : 'جدول سيناريو'}
                  </button>
                </div>
              </div>

              <div className="grid gap-8 p-6 md:grid-cols-2 md:p-8">
                {active.kind === 'svg' && active.filename ? (
                  <DiagramPreview diagram={active} onExpand={() => setLightboxDiagram(active)} />
                ) : active.scenarioId ? (
                  <UseCaseScenarioPanel scenarioId={active.scenarioId} />
                ) : null}

                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-brand-300">
                    الشرح الأكاديمي
                  </h4>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{active.description}</p>

                  <h4 className="mt-6 text-sm font-semibold uppercase tracking-wider text-brand-300">
                    نقاط التنفيذ الرئيسية
                  </h4>
                  <ul className="mt-3 space-y-2.5">
                    {active.keyPoints.map((point) => (
                      <li key={point} className="flex gap-2.5 text-sm text-slate-400">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {lightboxDiagram && lightboxDiagram.kind === 'svg' && lightboxDiagram.filename && (
          <Lightbox diagram={lightboxDiagram} onClose={() => setLightboxDiagram(null)} />
        )}
      </AnimatePresence>
    </section>
  )
}
