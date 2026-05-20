import { Pencil, Trash2 } from 'lucide-react'
import type { DiaryEntry } from '@/types/api'
import { roundNum } from '@/lib/utils'

interface Props {
  entry: DiaryEntry
  onEdit: (entry: DiaryEntry) => void
  onDelete: (id: string) => void
}

export function DiaryEntryRow({ entry, onEdit, onDelete }: Props) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {entry.notes || `Запись ${entry.id.slice(0, 6)}`}
        </p>
        <p className="text-xs text-gray-500">
          {entry.quantity_grams} г
          {entry.protein_g != null && ` · Б: ${roundNum(entry.protein_g)}г`}
          {entry.fat_g != null && ` · Ж: ${roundNum(entry.fat_g)}г`}
          {entry.carbs_g != null && ` · У: ${roundNum(entry.carbs_g)}г`}
        </p>
      </div>
      <div className="ml-4 flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-900">{roundNum(entry.calories)} ккал</span>
        <button
          onClick={() => onEdit(entry)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(entry.id)}
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
