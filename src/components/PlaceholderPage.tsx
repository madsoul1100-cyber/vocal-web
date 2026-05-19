import { PageHeader } from '@/components/ui/PageHeader'

export function PlaceholderPage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="card py-16 text-center">
          <p className="text-sm" style={{ color: 'var(--canvas-muted)' }}>
            {title} — this page uses the same shell as the Next.js app; API wiring is in progress.
          </p>
        </div>
      </div>
    </div>
  )
}
