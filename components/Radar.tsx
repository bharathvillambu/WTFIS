import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Animated, Easing, Text } from 'react-native';
import Svg, { Circle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';

interface RadarProps {
  userCount: number;
}

const { width } = Dimensions.get('window');
const RADAR_SIZE = Math.min(width - 80, 260);
const CENTER = RADAR_SIZE / 2;
const RINGS = [0.35, 0.7, 1];

/**
 * Purely decorative sweeping-radar animation. Nearby users are no longer
 * plotted as blips here (they used to clump/overlap awkwardly) — instead
 * they're rendered in the scrollable list directly below this component.
 */
export default function Radar({ userCount }: RadarProps) {
  const sweep = React.useRef(new Animated.Value(0)).current;
  const pulse = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sweepLoop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 3500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    sweepLoop.start();
    pulseLoop.start();
    return () => {
      sweepLoop.stop();
      pulseLoop.stop();
    };
  }, [sweep, pulse]);

  const spin = sweep.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={styles.wrapper}>
      <View style={{ width: RADAR_SIZE, height: RADAR_SIZE }}>
        <Svg width={RADAR_SIZE} height={RADAR_SIZE} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="bg" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#F5E1EF" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
            </RadialGradient>
          </Defs>
          <Circle cx={CENTER} cy={CENTER} r={CENTER - 2} fill="url(#bg)" stroke="#F0D6EE" strokeWidth={1} />
          {RINGS.map((r) => (
            <Circle
              key={r}
              cx={CENTER}
              cy={CENTER}
              r={(CENTER - 4) * r}
              stroke="#D62976"
              strokeOpacity={0.18}
              strokeWidth={1}
              fill="none"
            />
          ))}
          <Line x1={CENTER} y1={4} x2={CENTER} y2={RADAR_SIZE - 4} stroke="#D62976" strokeOpacity={0.1} strokeWidth={1} />
          <Line x1={4} y1={CENTER} x2={RADAR_SIZE - 4} y2={CENTER} stroke="#D62976" strokeOpacity={0.1} strokeWidth={1} />
        </Svg>

        <Animated.View
          pointerEvents="none"
          style={[styles.sweepWrapper, { width: RADAR_SIZE, height: RADAR_SIZE, transform: [{ rotate: spin }] }]}
        >
          <View style={styles.sweepBeam} />
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseRing,
            { transform: [{ translateX: CENTER - 8 }, { translateY: CENTER - 8 }, { scale: pulseScale }], opacity: pulseOpacity },
          ]}
        />

        <View style={styles.centerDot} />
      </View>

      <Text style={styles.countText}>
        {userCount > 0 ? `${userCount} ${userCount === 1 ? 'person' : 'people'} nearby` : 'Scanning for people nearby…'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sweepWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sweepBeam: {
    position: 'absolute',
    top: CENTER - 1,
    left: CENTER,
    width: RADAR_SIZE / 2 - 4,
    height: 2,
    backgroundColor: '#D62976',
    opacity: 0.6,
  },
  pulseRing: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#833AB4',
  },
  centerDot: {
    position: 'absolute',
    top: CENTER - 6,
    left: CENTER - 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#833AB4',
  },
  countText: {
    marginTop: 14,
    color: '#8E8E8E',
    fontSize: 13,
    fontWeight: '600',
  },
});
