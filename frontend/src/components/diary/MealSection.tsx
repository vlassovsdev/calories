import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { diaryApi } from '@/lib/api/diary'
import type { DiaryEntry } from '@/types/api'
import { DiaryEntryRow } from './DiaryEntryRow'
import { EditEntryDialog } from './EditEntryDialog'
import { roundNum } from '@/lib/utils'

interface Props {
  title: string
  entries: DiaryEntry[]
  date: string
  mealKey: string
  onAdd: () => void
}

export function MealSection({ title, entries, date, mealKey: _mealKey, onAdd }: Props) {
  const [open, setOpen] = useState(true)
  const [editEntry, setEditEntry] = useState<DiaryEntry | null>(null)
  const qc = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: diaryApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diary', date] })
      qc.invalidateQueries({ queryKey: ['stats-daily', date] })
    },
  })

  const total = entries.reduce((sum, e) => sum + e.calories, 0)

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm font-semibold text-gray-800">{title}</span>
            <span className="text-xs text-gray-400">{entries.length} записей</span>
          </div>
          <span className="text-sm font-medium text-gray-600">{roundNum(total)} ккал</span>
        </button>

        {open && (
          <div className="border-t border-gray-100 px-1 pb-1">
            {entries.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">Нет записей</p>
            ) : (
              entries.map(e => (
                <DiaryEntryRow
                  key={e.id}
                  entry={e}
                  onEdit={setEditEntry}
                  onDelete={id => deleteMutation.mutate(id)}
                />
              ))
            )}
            <button
              onClick={onAdd}
              className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-green-600 hover:bg-green-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Добавить
            </button>
          </div>
        )}
      </div>

      <EditEntryDialog entry={editEntry} onClose={() => setEditEntry(null)} />
    </>
  )
}
