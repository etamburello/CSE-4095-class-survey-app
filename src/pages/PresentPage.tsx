import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toDataURL } from 'qrcode'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { lmsShareText } from '../lib/csv.ts'
import { closeDashboardSurvey } from '../lib/dashboard-api.ts'
import { loadPresentSurvey, type PresentSurvey } from '../lib/present-api.ts'
import { primaryButton, secondaryButton, textLink } from '../lib/styles.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

export function PresentPage() {
  const { id } = useParams()
  const [survey, setSurvey] = useState<PresentSurvey | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string>()
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrError, setQrError] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [closing, setClosing] = useState(false)
  const [copied, setCopied] = useState(false)

  usePageTitle(survey ? survey.title : 'Present survey')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void loadPresentSurvey(id).then((result) => {
      if (cancelled) return
      if ('missing' in result) {
        setSurvey(null)
        setMissing(true)
        setError(undefined)
      } else if ('error' in result) {
        setSurvey(null)
        setMissing(false)
        setError(result.error)
      } else {
        setSurvey(result.survey)
        setMissing(false)
        setError(undefined)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  const publicUrl =
    survey?.public_slug && typeof window !== 'undefined'
      ? `${window.location.origin}/s/${survey.public_slug}`
      : null
  const displayUrl = survey?.public_slug
    ? `${window.location.host}/s/${survey.public_slug}`
    : null

  useEffect(() => {
    if (!publicUrl) return
    let cancelled = false
    void toDataURL(publicUrl, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) setQrUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrError(true)
      })
    return () => {
      cancelled = true
    }
  }, [publicUrl])

  if (!id) {
    return (
      <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center px-6">
        <h1 className="text-3xl font-semibold">Survey not found.</h1>
        <Link to="/dashboard" className={`${secondaryButton} mt-6 self-start`}>
          Back to Dashboard
        </Link>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center px-6">
        <p role="status" className="text-lg text-stone-700">
          Loading survey...
        </p>
      </main>
    )
  }

  if (missing) {
    return (
      <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center px-6">
        <h1 className="text-3xl font-semibold">Survey not found.</h1>
        <Link to="/dashboard" className={`${secondaryButton} mt-6 self-start`}>
          Back to Dashboard
        </Link>
      </main>
    )
  }

  if (error || !survey) {
    return (
      <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center px-6">
        <p role="alert" className="text-sm text-red-700">
          {error ?? 'The survey could not be loaded.'}
        </p>
        <Link to="/dashboard" className={`${secondaryButton} mt-6 self-start`}>
          Back to Dashboard
        </Link>
      </main>
    )
  }

  async function onClose() {
    if (!survey) return
    setClosing(true)
    const message = await closeDashboardSurvey(survey.id)
    if (message) {
      setError(message)
      setClosing(false)
      return
    }
    setSurvey({ ...survey, status: 'closed' })
    setConfirmClose(false)
    setClosing(false)
  }

  return (
    <main className="flex min-h-svh flex-col bg-white px-6 py-8 text-stone-950">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
        <Link to="/dashboard" className={textLink}>
          Dashboard
        </Link>
        <p className="flex items-center gap-2 text-sm">
          Status: <StatusBadge status={survey.status} />
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center text-center">
        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">
          {survey.title}
        </h1>

        {publicUrl && displayUrl ? (
          <>
            <div className="mt-10">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt={`QR code linking to ${displayUrl}`}
                  className="mx-auto h-auto w-[min(70vw,420px)]"
                />
              ) : qrError ? (
                <p className="text-lg text-red-700">
                  The QR code could not be generated. Use the link below.
                </p>
              ) : (
                <p className="text-lg text-stone-600">Preparing QR code...</p>
              )}
            </div>
            <a
              href={publicUrl}
              className="mt-8 max-w-full text-2xl font-medium break-all text-slate-800 underline decoration-stone-300 underline-offset-4 sm:text-3xl"
            >
              {displayUrl}
            </a>
            {qrUrl && (
              <a
                href={qrUrl}
                download={`${survey.public_slug}.png`}
                className={`${secondaryButton} mt-6`}
              >
                Download QR Code
              </a>
            )}
          </>
        ) : (
          <p className="mt-8 max-w-xl text-xl text-stone-700">
            Activate this survey to generate a QR code and a student link.
          </p>
        )}

        <p className="mt-10 text-4xl font-semibold sm:text-5xl">
          Responses: {survey.responseCount}
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            to={`/surveys/${survey.id}/results`}
            className={secondaryButton}
          >
            View Results
          </Link>
          {survey.public_slug && (
            <button
              type="button"
              className={secondaryButton}
              onClick={() => {
                void navigator.clipboard
                  .writeText(
                    lmsShareText({
                      title: survey.title,
                      description: '',
                      status: survey.status,
                      id: survey.id,
                      public_slug: survey.public_slug,
                      created_at: '',
                      updated_at: '',
                      questions: [],
                      lms_course_url: null,
                    }),
                  )
                  .then(() => {
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 2000)
                  })
              }}
            >
              {copied ? 'Copied' : 'Share for LMS'}
            </button>
          )}
          {survey.status === 'active' && (
            <button
              type="button"
              className={primaryButton}
              onClick={() => setConfirmClose(true)}
            >
              Close Survey
            </button>
          )}
          {survey.status === 'draft' && (
            <Link to={`/surveys/${survey.id}/edit`} className={primaryButton}>
              Back to editor
            </Link>
          )}
        </div>
      </div>

      {confirmClose && (
        <ConfirmDialog
          title={`Close "${survey.title}"?`}
          body="Students will no longer be able to submit responses. Results stay available."
          confirmLabel="Close"
          busy={closing}
          onConfirm={() => void onClose()}
          onCancel={() => {
            if (!closing) setConfirmClose(false)
          }}
        />
      )}
    </main>
  )
}
