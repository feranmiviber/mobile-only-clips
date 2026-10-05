'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] text-white">
      <h1 className="text-6xl font-bold text-white">Error</h1>
      <p className="mt-4 text-xl text-gray-400">Something went wrong</p>
      <p className="mt-2 text-sm text-gray-500">{error.message}</p>
      <div className="mt-8 flex gap-4">
        <button
          onClick={reset}
          className="rounded-lg bg-[#f59e0b] px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-[#d97706]"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-gray-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:border-gray-400"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
