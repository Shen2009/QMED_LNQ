import React, {useEffect, useRef} from 'react';
import {Animated, Easing, View, StyleSheet, Dimensions} from 'react-native';
import Svg, {Path, Defs, LinearGradient as SvgGradient, Stop} from 'react-native-svg';

const W = Dimensions.get('window').width;

// BEAT_W = chiều rộng 1 nhịp tim (px)
const BEAT_W = 88;
// Tạo đủ nhịp để path dài hơn 3x screen
const BEAT_COUNT = Math.ceil((W * 3) / BEAT_W) + 6;
// CYCLE_W = đúng số nhịp bằng 1 screen → khi loop reset về 0 pattern giống hệt
const BEATS_PER_CYCLE = Math.ceil(W / BEAT_W) + 2;
const CYCLE_W = BEAT_W * BEATS_PER_CYCLE;

// Vẽ 1 nhịp tim (P-wave nhỏ + QRS phức hợp) bắt đầu tại x
function buildBeat(x: number, mid: number): string {
  const px = x + 14;   // P-wave centre
  const qx = x + 32;   // Q dip start
  const rx = x + 38;   // R peak
  const sx = x + 44;   // S dip end
  const ex = x + BEAT_W;
  return (
    `L${px - 6},${mid} L${px},${mid - 5} L${px + 6},${mid} ` +
    `L${qx},${mid} L${qx + 2},${mid + 8} ` +
    `L${rx},${mid - 28} ` +
    `L${rx + 2},${mid + 10} ` +
    `L${sx + 4},${mid} ` +
    `L${ex},${mid} `
  );
}

function buildPath(mid: number): string {
  let d = `M0,${mid} L8,${mid} `;
  for (let i = 0; i < BEAT_COUNT; i++) {
    d += buildBeat(8 + i * BEAT_W, mid);
  }
  return d;
}

interface Props {
  color: string;
  height?: number;
}

export default function MiniEcgWave({color, height = 48}: Props) {
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Scroll đúng CYCLE_W rồi reset về 0 — seamless vì path tile đủ dài
    Animated.loop(
      Animated.timing(offset, {
        toValue: -CYCLE_W,
        duration: BEATS_PER_CYCLE * 820,  // ~820ms/nhịp ≈ 73 BPM
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
    return () => offset.stopAnimation();
  }, []);

  const mid = height / 2 + 4;
  const svgW = 8 + BEAT_COUNT * BEAT_W + 16;

  return (
    <View style={[styles.clip, {height}]} pointerEvents="none">
      <Animated.View style={{transform: [{translateX: offset}]}}>
        <Svg width={svgW} height={height + 8}>
          <Defs>
            <SvgGradient id="ecgGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0"    stopColor={color} stopOpacity="0" />
              <Stop offset="0.15" stopColor={color} stopOpacity="0.5" />
              <Stop offset="0.5"  stopColor={color} stopOpacity="1" />
              <Stop offset="0.85" stopColor={color} stopOpacity="0.5" />
              <Stop offset="1"    stopColor={color} stopOpacity="0" />
            </SvgGradient>
          </Defs>
          <Path
            d={buildPath(mid)}
            stroke="url(#ecgGrad)"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {overflow: 'hidden', width: '100%'},
});
