import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] text-white">
      <h1 className="text-6xl font-bold text-white">404</h1>
      <p className="mt-4 text-xl text-gray-400">Page not found</p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-[#f59e0b] px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-[#d97706]"
      >
        Go Home
      </Link>
    </div>
  )
}
