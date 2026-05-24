import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Upload, CheckCircle, XCircle, Loader2, History, Plus } from 'lucide-react'
import { photosApi } from '@/lib/api/photos'
import { AddEntryDialog } from '@/components/diary/AddEntryDialog'
import { today } from '@/lib/utils'
import type { PhotoJob } from '@/types/api'

function PhotoJobPoller({
  jobId,
  onAddToDiary,
}: {
  jobId: string
  onAddToDiary: (calories: number, desc: string) => void
}) {
  const qc = useQueryClient()
  const { data: job, error } = useQuery({
    queryKey: ['photo-job', jobId],
    queryFn: () => photosApi.getJob(jobId),
    refetchInterval: d => {
      const status = d?.state?.data?.status
      return status === 'pending' || status === 'processing' ? 2000 : false
    },
    staleTime: 0,
  })

  useEffect(() => {
    if (job?.status === 'completed' || job?.status === 'failed') {
      qc.invalidateQueries({ queryKey: ['photo-jobs-history'] })
    }
  }, [job?.status, qc])

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
        <XCircle className="h-4 w-4 shrink-0" />
        Ошибка при получении результата
      </div>
    )
  }

  if (!job || job.status === 'pending' || job.status === 'processing') {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Анализируем фото... это займёт несколько секунд
      </div>
    )
  }

  if (job.status === 'failed') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
        <XCircle className="h-4 w-4 shrink-0" />
        {job.error_message ?? 'Не удалось распознать еду'}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <p className="text-sm font-semibold text-green-800">Анализ завершён</p>
      </div>
      <p className="mb-1 text-sm text-gray-700">{job.result_food_desc}</p>
      {job.result_calories != null && (
        <p className="mb-3 text-lg font-bold text-gray-900">{Math.round(job.result_calories)} ккал</p>
      )}
      <button
        onClick={() =>
          onAddToDiary(job.result_calories ?? 0, job.result_food_desc ?? '')
        }
        className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
      >
        Добавить в дневник
      </button>
    </div>
  )
}

function HistoryItem({
  job,
  onAddToDiary,
}: {
  job: PhotoJob
  onAddToDiary: (calories: number, desc: string) => void
}) {
  const date = new Date(job.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  if (job.status === 'completed') {
    return (
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">
            {job.result_food_desc ?? 'Блюдо'}
          </p>
          <p className="text-xs text-gray-400">{date}</p>
        </div>
        <div className="ml-3 flex items-center gap-3">
          {job.result_calories != null && (
            <span className="text-sm font-semibold text-gray-700">
              {Math.round(job.result_calories)} ккал
            </span>
          )}
          <button
            onClick={() => onAddToDiary(job.result_calories ?? 0, job.result_food_desc ?? '')}
            className="flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600"
          >
            <Plus className="h-3 w-3" />
            В дневник
          </button>
        </div>
      </div>
    )
  }

  if (job.status === 'failed') {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
        <p className="text-xs text-red-500">{date} · Ошибка анализа</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <p className="text-xs text-gray-400">{date} · Обрабатывается...</p>
    </div>
  )
}

export function PhotoPage() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addPrefill, setAddPrefill] = useState<{ calories?: number; notes?: string }>({})
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: historyData } = useQuery({
    queryKey: ['photo-jobs-history'],
    queryFn: photosApi.listJobs,
    staleTime: 30000,
  })
  const history = historyData ?? []

  const handleFile = async (file: File, previewUrl: string) => {
    setUploadError('')
    setJobId(null)
    setPreview(previewUrl)
    setUploading(true)
    try {
      const res = await photosApi.analyze(file)
      setJobId(res.job_id)
    } catch (err) {
      setUploadError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (file: File) => {
    setPendingFile(file)
    setPendingPreviewUrl(URL.createObjectURL(file))
  }

  const handleConfirm = () => {
    if (!pendingFile || !pendingPreviewUrl) return
    const url = pendingPreviewUrl
    setPendingFile(null)
    setPendingPreviewUrl(null)
    handleFile(pendingFile, url)
  }

  const handleCancelPreview = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    setPendingFile(null)
    setPendingPreviewUrl(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const openAddToDiary = (calories: number, desc: string) => {
    setAddPrefill({ calories: Math.round(calories), notes: desc })
    setAddDialogOpen(true)
  }

  const reset = () => {
    setJobId(null)
    setPreview(null)
    setUploadError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-6">
      <h1 className="mb-2 text-xl font-semibold text-gray-900">Анализ фото</h1>
      <p className="mb-6 text-sm text-gray-500">
        Сфотографируйте блюдо — ИИ определит калорийность автоматически
      </p>

      {!preview ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 transition-colors hover:border-green-400 hover:bg-green-50"
          onClick={() => inputRef.current?.click()}
        >
          <div className="rounded-full bg-white p-4 shadow-sm">
            <Camera className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">Нажмите или перетащите фото</p>
          <p className="text-xs text-gray-400">JPEG, PNG, WebP — до 5 МБ</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <img src={preview} alt="Uploaded food" className="max-h-64 w-full object-cover" />
          </div>

          {uploading && (
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <Upload className="h-4 w-4 animate-bounce shrink-0" />
              Загружаем фото...
            </div>
          )}

          {uploadError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              <XCircle className="h-4 w-4 shrink-0" />
              {uploadError}
            </div>
          )}

          {jobId && !uploading && (
            <PhotoJobPoller jobId={jobId} onAddToDiary={openAddToDiary} />
          )}

          <button
            onClick={reset}
            className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Загрузить другое фото
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-medium text-gray-700">История анализов</h2>
          </div>
          <div className="space-y-2">
            {history.map(job => (
              <HistoryItem key={job.id} job={job} onAddToDiary={openAddToDiary} />
            ))}
          </div>
        </div>
      )}

      <AddEntryDialog
        date={today()}
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        prefill={addPrefill}
      />

      {pendingPreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={handleCancelPreview}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={pendingPreviewUrl}
              alt="Предпросмотр"
              className="max-h-72 w-full object-cover"
            />
            <div className="p-4">
              <p className="mb-4 text-sm font-medium text-gray-700">
                Отправить это фото на распознавание?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  className="flex-1 rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-white hover:bg-green-600 active:scale-95 transition-transform"
                >
                  Отправить
                </button>
                <button
                  onClick={handleCancelPreview}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-95 transition-transform"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
