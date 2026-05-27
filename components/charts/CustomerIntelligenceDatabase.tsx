'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  loadCustomerIntelligenceData,
  PROPOSITION_TABLE_CONFIG,
  type CustomerIntelligenceData,
  type CustomerIntelligenceProposition,
  type CustomerIntelligenceRow,
  type TableColumn,
} from '@/lib/utility-customer-intelligence-data'

interface AccordionSectionProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

function AccordionSection({ title, isOpen, onToggle, children }: AccordionSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-gray-50 rounded-lg transition-colors"
      >
        <span className="text-lg font-semibold text-black">{title}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="px-2 pb-4 bg-white rounded-b-lg">{children}</div>}
    </div>
  )
}

function renderSingleCellLine(value: string, column: TableColumn) {
  if (column.isLink === 'email' && value.includes('@')) {
    return (
      <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
        {value}
      </a>
    )
  }

  if (column.isLink === 'url') {
    const href = value.startsWith('http') ? value : `https://${value}`
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
        {value}
      </a>
    )
  }

  return value
}

function renderCellValue(value: string, column: TableColumn) {
  if (!value) return '—'

  const lines = value.split('\n').map((line) => line.trim()).filter(Boolean)
  if (lines.length === 1) {
    return renderSingleCellLine(lines[0], column)
  }

  return (
    <div className="space-y-2">
      {lines.map((line, index) => (
        <div key={`${line}-${index}`}>{renderSingleCellLine(line, column)}</div>
      ))}
    </div>
  )
}

function PropositionTable({
  propositionKey,
  rows,
}: {
  propositionKey: 'proposition1' | 'proposition2' | 'proposition3'
  rows: CustomerIntelligenceRow[]
}) {
  const config = PROPOSITION_TABLE_CONFIG[propositionKey]

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th
              rowSpan={2}
              className="bg-[#FFF8DC] border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-black min-w-[60px]"
            >
              S.No.
            </th>
            {config.groups.map((group) => (
              <th
                key={group.label}
                colSpan={group.colSpan}
                className={`border border-gray-300 px-3 py-2 text-center text-sm font-semibold ${group.headerClass}`}
              >
                {group.label}
              </th>
            ))}
          </tr>
          <tr>
            {config.columns.map((column) => (
              <th
                key={column.key}
                className={`border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-black ${column.headerClass}`}
                style={{ minWidth: column.minWidth }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.sNo}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-300 px-3 py-2 text-sm text-black text-center">{row.sNo}</td>
              {config.columns.map((column) => (
                <td key={column.key} className="border border-gray-300 px-3 py-2 text-sm text-black">
                  {renderCellValue(String(row[column.key] ?? ''), column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface CustomerIntelligenceDatabaseProps {
  title?: string
  height?: number
}

export default function CustomerIntelligenceDatabase({ title }: CustomerIntelligenceDatabaseProps) {
  const [data, setData] = useState<CustomerIntelligenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openProposition, setOpenProposition] = useState<string>('proposition-1')

  useEffect(() => {
    loadCustomerIntelligenceData()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const toggleProposition = (id: string) => {
    setOpenProposition((current) => (current === id ? '' : id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#34A0A4]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        {error || 'Customer intelligence data unavailable'}
      </div>
    )
  }

  const propositions: Array<{
    key: 'proposition1' | 'proposition2' | 'proposition3'
    proposition: CustomerIntelligenceProposition
  }> = [
    { key: 'proposition1', proposition: data.proposition1 },
    { key: 'proposition2', proposition: data.proposition2 },
    { key: 'proposition3', proposition: data.proposition3 },
  ]

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-black mb-2">{title || data.marketTitle}</h2>
        <p className="text-sm text-gray-700">{data.subtitle}</p>
        <p className="text-xs text-gray-600 mt-1">{data.entityNote}</p>
      </div>

      {propositions.map(({ key, proposition }) => (
        <AccordionSection
          key={proposition.id}
          title={proposition.label}
          isOpen={openProposition === proposition.id}
          onToggle={() => toggleProposition(proposition.id)}
        >
          <PropositionTable propositionKey={key} rows={proposition.rows} />
        </AccordionSection>
      ))}
    </div>
  )
}
