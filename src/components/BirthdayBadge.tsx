import { Badge } from './Badge'
import type { BirthdayBucket } from '@/lib/insights'

const TONE: Record<BirthdayBucket, 'warning' | 'info' | 'primary' | 'neutral'> = {
  today: 'warning',
  tomorrow: 'info',
  this_week: 'primary',
  later: 'neutral',
}

const LABEL: Record<BirthdayBucket, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  this_week: 'Next 7 days',
  later: 'Later',
}

export function BirthdayBadge({ bucket, compact }: { bucket: BirthdayBucket; compact?: boolean }) {
  return <Badge label={LABEL[bucket]} tone={TONE[bucket]} compact={compact} />
}
