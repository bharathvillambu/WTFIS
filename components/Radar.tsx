import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Dimensions, Animated, Easing } from 'react-native';
import Svg, { Circle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import RadarUserPoint from '@/components/RadarUser';
import type { NearbyUser } from '@/types/user';
import { DEFAULT_RADIUS_METERS } from '@/constants/config';

interface RadarProps {
  users: NearbyUser[];
  radiusMeters?: number;
  onSelectUser: (user: NearbyUser) => void;
}

const { width } = Dimensions.get('window');
const RADAR_SIZE = Math.min(width - 48, 380);
const CENTER = RADAR_SIZE / 2;
const RINGS = [0.25, 0.5, 0.75, 1];

/**
 * Deterministically derives a stable pseudo-angle for a user id so their
 * radar position doesn't jump around on every refresh.
 */
function angleForId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 360;
  }
  return (hash / 360) * Math.PI * 2;
}

export default function Radar({
  users,
  radiusMeters = DEFAULT_RADIUS_METERS,
  onSelectUser,
}: RadarProps) {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  const spin = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const points = useMemo(() => {
    const maxRadius = CENTER - 24;
    return users.map((user) => {
      const angle = angleForId(user.id);
      const normalizedDistance = Math.min(user.distance_meters / radiusMeters, 1);
      const r = 20 + normalizedDistance * (maxRadius - 20);
      const x = CENTER + r * Math.cos(angle);
      const y = CENTER + r * Math.sin(angle);
      return { user, x, y };
    });
  }, [users, radiusMeters]);

  return (
    <View style={styles.wrapper}>
      <View style={{ width: RADAR_SIZE, height: RADAR_SIZE }}>
        <Svg width={RADAR_SIZE} height={RADAR_SIZE} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="bg" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#0d2b28" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#020604" stopOpacity="1" />
            </RadialGradient>
          </Defs>
          <Circle cx={CENTER} cy={CENTER} r={CENTER - 2} fill="url(#bg)" />
          {RINGS.map((r) => (
            <Circle
              key={r}
              cx={CENTER}
              cy={CENTER}
              r={(CENTER - 4) * r}
              stroke="#1fffc9"
              strokeOpacity={0.25}
              strokeWidth={1}
              fill="none"
            />
          ))}
          <Line
            x1={CENTER}
            y1={4}
            x2={CENTER}
            y2={RADAR_SIZE - 4}
            stroke="#1fffc9"
            strokeOpacity={0.12}
            strokeWidth={1}
          />
          <Line
            x1={4}
            y1={CENTER}
            x2={RADAR_SIZE - 4}
            y2={CENTER}
            stroke="#1fffc9"
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        </Svg>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.sweepWrapper,
            { width: RADAR_SIZE, height: RADAR_SIZE, transform: [{ rotate: spin }] },
          ]}
        >
          <View style={styles.sweepBeam} />
        </Animated.View>

        <View style={styles.centerDot} />

        {points.map(({ user, x, y }) => (
          <RadarUserPoint
            key={user.id}
            user={user}
            x={x}
            y={y}
            onPress={() => onSelectUser(user)}
          />
        ))}
      </View>
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
    backgroundColor: '#39ffc4',
    opacity: 0.55,
  },
  centerDot: {
    position: 'absolute',
    top: CENTER - 5,
    left: CENTER - 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#39ffc4',
    shadowColor: '#39ffc4',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});

