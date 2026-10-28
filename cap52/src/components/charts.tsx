import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { SPACING } from '../theme/themes';
import { AppText } from './AppText';

interface Point {
  x: number; // 0..1
  y: number; // valeur brute
}

/**
 * Graphique en lignes minimal (SVG) : évite une bibliothèque de graphiques complète
 * pour deux courbes. Les points sont fournis normalisés sur l'axe X.
 */
export function LineChart({
  series,
  height = 160,
  accessibilityLabel,
}: {
  series: { points: Point[]; color: string; dashed?: boolean; label: string }[];
  height?: number;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const maxY = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y)));
  const pad = 4;
  const toPath = (points: Point[]) =>
    points
      .map((p, i) => {
        const x = pad + p.x * (width - pad * 2);
        const y = height - pad - (p.y / maxY) * (height - pad * 2);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={styles.wrap}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {[0.25, 0.5, 0.75].map((f) => (
              <Line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke={colors.border} strokeWidth={1} />
            ))}
            {series.map((s) =>
              s.points.length > 1 ? (
                <Path
                  key={s.label}
                  d={toPath(s.points)}
                  stroke={s.color}
                  strokeWidth={s.dashed ? 2 : 3}
                  strokeDasharray={s.dashed ? '6 6' : undefined}
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null,
            )}
          </Svg>
        )}
      </View>
      <View style={styles.legend}>
        {series.map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: s.color }]} />
            <AppText variant="caption" muted>
              {s.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Histogramme horizontal simple (comparaison, mois). */
export function BarList({ items }: { items: { label: string; value: number; display: string; color?: string }[] }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <View style={styles.bars}>
      {items.map((i) => (
        <View key={i.label} style={styles.barRow} accessible accessibilityLabel={`${i.label} : ${i.display}`}>
          <View style={styles.barHeader}>
            <AppText variant="caption">{i.label}</AppText>
            <AppText variant="caption" muted numeric>
              {i.display}
            </AppText>
          </View>
          <Svg height={10} width="100%">
            <Rect x={0} y={0} width="100%" height={10} rx={5} fill={colors.surfaceAlt} />
            <Rect x={0} y={0} width={`${(i.value / max) * 100}%`} height={10} rx={5} fill={i.color ?? colors.accent} />
          </Svg>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.sm },
  legend: { flexDirection: 'row', gap: SPACING.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  swatch: { width: 12, height: 4, borderRadius: 2 },
  bars: { gap: SPACING.md },
  barRow: { gap: SPACING.xs },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between' },
});
