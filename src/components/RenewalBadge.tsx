import { Badge } from './Badge'
import type { RenewalBucket } from '@/lib/insights'

const TONE: Record<RenewalBucket, 'danger' | 'warning' | 'info' | 'primary' | 'accent' | 'neutral'> = {
  overdue: 'danger',
  today: 'warning',
  tomorrow: 'info',
  this_week: 'primary',
  this_month: 'accent',
  later: 'neutral',
}

const LABEL: Record<RenewalBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  this_week: 'Next 7 days',
  this_month: 'This month',
  later: 'Later',
}

export function RenewalBadge({ bucket, compact }: { bucket: RenewalBucket; compact?: boolean }) {
  return <Badge label={LABEL[bucket]} tone={TONE[bucket]} compact={compact} />
}
