import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Camera, Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { photosApi } from '@/lib/api/photos'
import { AddEntryDialog } from '@/components/diary/AddEntryDialog'
import { today } from '@/lib/utils'

function PhotoJobPoller({
  jobId,
  onAddToDiary,
}: {
  jobId: string
  onAddToDiary: (calories: number, desc: string) => void
}) {
  const { data: job, error } = useQuery({
    queryKey: ['photo-job', jobId],
    queryFn: () => photosApi.getJob(jobId),
    refetchInterval: d => {
      const status = d?.state?.data?.status
      return status === 'pending' || status === 'processing' ? 2000 : false
    },
    staleTime: 0,
  })

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

export function PhotoPage() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addPrefill, setAddPrefill] = useState<{ calories?: number; notes?: string }>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setUploadError('')
    setJobId(null)
    setPreview(URL.createObjectURL(file))
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
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

      <AddEntryDialog
        date={today()}
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        prefill={addPrefill}
      />
    </div>
  )
}
