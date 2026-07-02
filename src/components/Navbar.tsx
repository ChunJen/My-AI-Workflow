import Link from "next/link";

export function Navbar() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-zinc-900">
            AI Workflow Ops
          </span>
          <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
            Dashboard
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/workflows"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Workflows
          </Link>
          <Link
            href="/admin"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Admin
          </Link>
          <Link
            href="/workflows/new"
            className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            + New Workflow
          </Link>
        </nav>
      </div>
    </header>
  );
}
