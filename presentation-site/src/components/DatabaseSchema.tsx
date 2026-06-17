import { motion } from 'framer-motion'
import { Database, Table2 } from 'lucide-react'

import { coreTables, extendedTables, extendedTablesNote } from '../data/schema'

export function DatabaseSchema() {
  return (
    <section id="database" className="section-padding border-t border-white/5">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 max-w-3xl"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">
            طبقة البيانات
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">مخطط قاعدة البيانات</h2>
          <p className="mt-4 text-lg text-slate-400">
            PostgreSQL يخزّن الحالة الرسمية للنظام. المخطط مُدار بنسخ عبر ترحيلات Alembic
            مع مفاتيح UUID وأنواع ENUM وقيود المفاتيح الأجنبية.
          </p>
        </motion.div>

        <div className="space-y-10">
          {coreTables.map((table, tableIndex) => (
            <motion.div
              key={table.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: tableIndex * 0.05 }}
              className="glass-panel overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-6 py-4 md:px-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                  <Table2 size={18} />
                </div>
                <div>
                  <h3 className="font-mono text-lg font-bold text-white">{table.name}</h3>
                  <p className="text-sm text-slate-400">{table.description}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-right text-sm">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-6 py-3 font-semibold text-slate-300 md:px-8">العمود</th>
                      <th className="px-6 py-3 font-semibold text-slate-300 md:px-8">النوع</th>
                      <th className="px-6 py-3 font-semibold text-slate-300 md:px-8">القيود</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.columns.map((col, rowIndex) => (
                      <tr
                        key={col.name}
                        className={`border-b border-white/5 transition hover:bg-white/[0.03] ${
                          rowIndex % 2 === 0 ? '' : 'bg-white/[0.01]'
                        }`}
                      >
                        <td className="px-6 py-3 font-mono text-brand-200 md:px-8">{col.name}</td>
                        <td className="px-6 py-3 font-mono text-cyan-300/90 md:px-8">{col.type}</td>
                        <td className="px-6 py-3 text-slate-400 md:px-8">{col.constraints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4"
        >
          <Database className="mt-0.5 shrink-0 text-slate-500" size={18} />
          <p className="text-sm text-slate-400">
            {extendedTablesNote}{' '}
            <span className="font-mono text-slate-300">{extendedTables.join('، ')}</span>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
