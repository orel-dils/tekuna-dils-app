import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { Colors } from '@/constants/theme';

interface StarOfDavidProps {
  size?: number;
}

// Constellation-style Star of David with nodes and lines
export function StarOfDavid({ size = 200 }: StarOfDavidProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slow rotation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [rotateAnim, pulseAnim, fadeAnim]);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  // Triangle 1 (pointing up) vertices
  const t1 = [
    { x: cx, y: cy - r },
    { x: cx - r * Math.sin(Math.PI / 3), y: cy + r * 0.5 },
    { x: cx + r * Math.sin(Math.PI / 3), y: cy + r * 0.5 },
  ];

  // Triangle 2 (pointing down) vertices
  const t2 = [
    { x: cx, y: cy + r },
    { x: cx - r * Math.sin(Math.PI / 3), y: cy - r * 0.5 },
    { x: cx + r * Math.sin(Math.PI / 3), y: cy - r * 0.5 },
  ];

  // All nodes (vertices of both triangles)
  const nodes = [...t1, ...t2];

  // Intersection points (inner hexagon)
  const innerR = r * 0.577;
  const innerNodes = Array.from({ length: 6 }, (_, i) => ({
    x: cx + innerR * Math.cos((Math.PI / 6) + (i * Math.PI) / 3),
    y: cy + innerR * Math.sin((Math.PI / 6) + (i * Math.PI) / 3),
  }));

  const allNodes = [...nodes, ...innerNodes, { x: cx, y: cy }];

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ rotate: spin }],
      }}
    >
      <Animated.View style={{ opacity: pulseAnim }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Triangle 1 lines (gold) */}
          <Line x1={t1[0].x} y1={t1[0].y} x2={t1[1].x} y2={t1[1].y} stroke={Colors.gold} strokeWidth={1.5} opacity={0.8} />
          <Line x1={t1[1].x} y1={t1[1].y} x2={t1[2].x} y2={t1[2].y} stroke={Colors.gold} strokeWidth={1.5} opacity={0.8} />
          <Line x1={t1[2].x} y1={t1[2].y} x2={t1[0].x} y2={t1[0].y} stroke={Colors.gold} strokeWidth={1.5} opacity={0.8} />

          {/* Triangle 2 lines (white) */}
          <Line x1={t2[0].x} y1={t2[0].y} x2={t2[1].x} y2={t2[1].y} stroke={Colors.white} strokeWidth={1.5} opacity={0.6} />
          <Line x1={t2[1].x} y1={t2[1].y} x2={t2[2].x} y2={t2[2].y} stroke={Colors.white} strokeWidth={1.5} opacity={0.6} />
          <Line x1={t2[2].x} y1={t2[2].y} x2={t2[0].x} y2={t2[0].y} stroke={Colors.white} strokeWidth={1.5} opacity={0.6} />

          {/* Inner hexagon connection lines */}
          {innerNodes.map((node, i) => {
            const next = innerNodes[(i + 1) % innerNodes.length];
            return (
              <Line
                key={`inner-${i}`}
                x1={node.x}
                y1={node.y}
                x2={next.x}
                y2={next.y}
                stroke={Colors.gold}
                strokeWidth={0.8}
                opacity={0.4}
              />
            );
          })}

          {/* Cross-connections to center */}
          {innerNodes.map((node, i) => (
            <Line
              key={`center-${i}`}
              x1={node.x}
              y1={node.y}
              x2={cx}
              y2={cy}
              stroke={Colors.gold}
              strokeWidth={0.5}
              opacity={0.3}
            />
          ))}

          {/* Node circles */}
          {allNodes.map((node, i) => (
            <Circle
              key={`node-${i}`}
              cx={node.x}
              cy={node.y}
              r={i === allNodes.length - 1 ? 4 : i < 6 ? 3.5 : 2.5}
              fill={i < 3 ? Colors.gold : i < 6 ? Colors.white : Colors.gold}
              opacity={i === allNodes.length - 1 ? 1 : i < 6 ? 0.9 : 0.6}
            />
          ))}
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
