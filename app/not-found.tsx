import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-3 text-muted-foreground">The page you requested does not exist or may have moved.</p>
        <Link className="mt-7 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground" href="/">
          Return home
        </Link>
      </div>
    </main>
  )
}
