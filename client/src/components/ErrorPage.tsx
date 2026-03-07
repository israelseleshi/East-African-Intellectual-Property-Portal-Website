import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom'
import { WarningCircle, House } from '@phosphor-icons/react'

export default function ErrorPage() {
    const error = useRouteError()
    let errorMessage: string

    if (isRouteErrorResponse(error)) {
        // error is Amazon ErrorResponse
        errorMessage = error.statusText || error.data?.message
    } else if (error instanceof Error) {
        errorMessage = error.message
    } else if (typeof error === 'string') {
        errorMessage = error
    } else {
        console.error(error)
        errorMessage = 'Unknown error'
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--eai-bg)] p-4 text-center">
            <div className="max-w-md rounded-2xl border border-[var(--eai-border)] bg-white p-8 shadow-xl dark:bg-slate-900">
                <div className="mb-6 flex justify-center text-red-500">
                    <WarningCircle size={64} weight="duotone" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
                    Oops! Something went wrong
                </h1>
                <p className="mb-6 text-slate-600 dark:text-slate-400">
                    We encountered an unexpected error while rendering this page.
                </p>
                <div className="mb-8 rounded-lg bg-slate-100 p-4 font-mono text-sm text-red-600 dark:bg-slate-800">
                    {errorMessage}
                </div>
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--eai-primary)] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                    <House size={18} />
                    Return Home
                </Link>
            </div>
        </div>
    )
}
