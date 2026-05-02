export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background p-8 text-foreground">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-16 rounded-3xl bg-surface-2 animate-pulse" />

        <div className="grid gap-6">
          <div className="h-72 rounded-3xl bg-surface-2 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 rounded-3xl bg-surface-2 animate-pulse" />
            <div className="h-64 rounded-3xl bg-surface-2 animate-pulse" />
          </div>
          <div className="h-44 rounded-3xl bg-surface-2 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
