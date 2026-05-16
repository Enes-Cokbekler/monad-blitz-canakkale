export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-12">
      <div className="w-full max-w-3xl animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-lg bg-surface-secondary" />
        <div className="h-4 w-64 rounded-lg bg-surface-secondary" />
        <div className="h-48 rounded-xl bg-surface-secondary" />
      </div>
    </main>
  );
}
