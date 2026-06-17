import { FileText } from 'lucide-react'

import { useCaseScenarios } from '../data/scenarios'

type Props = {
  scenarioId: string
}

export function UseCaseScenarioPanel({ scenarioId }: Props) {
  const scenario = useCaseScenarios[scenarioId]
  if (!scenario) return null

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/60">
      <div className="flex items-center gap-2 border-b border-white/10 bg-brand-500/10 px-5 py-3">
        <FileText size={18} className="text-brand-300" />
        <h4 className="font-semibold text-white">{scenario.title}</h4>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-4 md:p-5">
        <table className="w-full text-right text-sm">
          <tbody>
            {scenario.fields.map((field) => (
              <tr key={field.label} className="border-b border-white/5 last:border-0">
                <th className="w-36 shrink-0 px-3 py-3 align-top font-semibold text-brand-300 md:w-44">
                  {field.label}
                </th>
                <td className="px-3 py-3 text-slate-300">
                  {Array.isArray(field.value) ? (
                    <ul className="space-y-1.5">
                      {field.value.map((line) => (
                        <li key={line} className="flex gap-2">
                          <span className="text-brand-500">•</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="leading-relaxed">{field.value}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
