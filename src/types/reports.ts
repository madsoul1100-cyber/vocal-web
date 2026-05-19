export interface ReportsSummary {
  total: number
  open: number
  closed: number
  criticalOpen: number
  resolutionRate: number
  stageCounts: Record<string, number>
  topCategories: Array<{ name: string; count: number }>
}
