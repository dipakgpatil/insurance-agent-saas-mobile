import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'
import { colors, radii, spacing, typography } from '@/theme'

type Datum = { label: string; value: number; emphasis?: number }

type Props = {
  data: Datum[]
  height?: number
  barColor?: string
  emphasisColor?: string
  showXLabels?: boolean
}

export function MiniBarChart({
  data,
  height = 180,
  barColor = colors.primary,
  emphasisColor = colors.success,
  showXLabels = true,
}: Props) {
  const layout = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.emphasis ?? 0)))
    const padX = 8
    const padTop = 12
    const padBottom = showXLabels ? 22 : 8
    return { max, padX, padTop, padBottom }
  }, [data, showXLabels])

  if (data.length === 0) {
    return <Text style={styles.empty}>No data yet.</Text>
  }

  const width = Math.max(280, data.length * 24)
  const chartHeight = height - layout.padTop - layout.padBottom
  const slotWidth = (width - layout.padX * 2) / data.length

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {data.map((d, i) => {
          const valueH = (d.value / layout.max) * chartHeight
          const emphasisH = ((d.emphasis ?? 0) / layout.max) * chartHeight
          const x = layout.padX + i * slotWidth + slotWidth * 0.18
          const barWidth = slotWidth * 0.64
          const yValue = layout.padTop + (chartHeight - valueH)
          const yEmphasis = layout.padTop + (chartHeight - emphasisH)
          return (
            <View key={`${d.label}-${i}`}>
              <Rect x={x} y={yValue} width={barWidth} height={Math.max(2, valueH)} rx={4} fill={barColor} opacity={0.18} />
              {d.emphasis !== undefined && d.emphasis > 0 ? (
                <Rect
                  x={x}
                  y={yEmphasis}
                  width={barWidth}
                  height={Math.max(2, emphasisH)}
                  rx={4}
                  fill={emphasisColor}
                />
              ) : (
                <Rect x={x} y={yValue} width={barWidth} height={Math.max(2, valueH)} rx={4} fill={barColor} />
              )}
              {showXLabels && i % Math.ceil(data.length / 6) === 0 ? (
                <SvgText
                  x={x + barWidth / 2}
                  y={height - 6}
                  fontSize="9"
                  fontWeight="600"
                  fill={colors.textSubtle}
                  textAnchor="middle"
                >
                  {d.label}
                </SvgText>
              ) : null}
            </View>
          )
        })}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  empty: {
    ...typography.caption,
    color: colors.textSubtle,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    textAlign: 'center',
  },
})
