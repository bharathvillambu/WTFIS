import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

const STROKE_WIDTH = 1.8;
const LINE = {
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function RadarNavIcon({ size = 24, color = '#8E8E8E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={STROKE_WIDTH} {...LINE} />
      <Circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth={STROKE_WIDTH} opacity={0.9} {...LINE} />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
      <Line x1="12" y1="3.5" x2="12" y2="8" stroke={color} strokeWidth={STROKE_WIDTH} {...LINE} />
      <Line x1="12" y1="16" x2="12" y2="20.5" stroke={color} strokeWidth={STROKE_WIDTH} {...LINE} />
      <Line x1="3.5" y1="12" x2="8" y2="12" stroke={color} strokeWidth={STROKE_WIDTH} {...LINE} />
      <Line x1="16" y1="12" x2="20.5" y2="12" stroke={color} strokeWidth={STROKE_WIDTH} {...LINE} />
    </Svg>
  );
}

export function MessagesNavIcon({ size = 24, color = '#8E8E8E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 6.5h14A2.5 2.5 0 0 1 21.5 9v6A2.5 2.5 0 0 1 19 17.5H11.2L6.6 20.5v-3H5A2.5 2.5 0 0 1 2.5 15V9A2.5 2.5 0 0 1 5 6.5Z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        {...LINE}
      />
      <Circle cx="9" cy="11.5" r="0.9" fill={color} />
      <Circle cx="12" cy="11.5" r="0.9" fill={color} />
      <Circle cx="15" cy="11.5" r="0.9" fill={color} />
    </Svg>
  );
}

export function ProfileNavIcon({ size = 24, color = '#8E8E8E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="9" r="3.25" stroke={color} strokeWidth={STROKE_WIDTH} {...LINE} />
      <Path
        d="M5.8 19.2c1.4-3 4-4.7 6.2-4.7s4.8 1.7 6.2 4.7"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        {...LINE}
      />
      <Path
        d="M8.2 19.2c.9-1.8 2.4-2.9 3.8-2.9s2.9 1.1 3.8 2.9"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        opacity={0.75}
        {...LINE}
      />
    </Svg>
  );
}

export function SettingsNavIcon({ size = 24, color = '#8E8E8E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3.25" stroke={color} strokeWidth={STROKE_WIDTH} {...LINE} />
      <Circle cx="12" cy="12" r="7.2" stroke={color} strokeWidth={STROKE_WIDTH} opacity={0.8} {...LINE} />
      <Line x1="12" y1="2.5" x2="12" y2="5.4" stroke={color} strokeWidth={STROKE_WIDTH} {...LINE} />
      <Line x1="12" y1="18.6" x2="12" y2="21.5" stroke={color} strokeWidth={STROKE_WIDTH} {...LINE} />
      <Line x1="2.5" y1="12" x2="5.4" y2="12" stroke={color} strokeWidth={STROKE_WIDTH} {...LINE} />
      <Line x1="18.6" y1="12" x2="21.5" y2="12" stroke={color} strokeWidth={STROKE_WIDTH} {...LINE} />
      <Line x1="5.3" y1="5.3" x2="7.3" y2="7.3" stroke={color} strokeWidth={STROKE_WIDTH} {...LINE} />
      <Line x1="16.7" y1="16.7" x2="18.7" y2="18.7" stroke={color} strokeWidth={STROKE_WIDTH} {...LINE} />
      <Line x1="5.3" y1="18.7" x2="7.3" y2="16.7" stroke={color} strokeWidth={STROKE_WIDTH} {...LINE} />
      <Line x1="16.7" y1="7.3" x2="18.7" y2="5.3" stroke={color} strokeWidth={STROKE_WIDTH} {...LINE} />
    </Svg>
  );
}

export function NotificationBellIcon({ size = 24, color = '#833AB4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21.25a2.5 2.5 0 0 0 2.48-2.25H9.52A2.5 2.5 0 0 0 12 21.25Zm7-5.5-1.4-1.4V11a5.6 5.6 0 0 0-4.25-5.43v-.32a1.35 1.35 0 1 0-2.7 0v.32A5.6 5.6 0 0 0 6.4 11v3.35L5 15.75v1h14v-1Z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        {...LINE}
      />
    </Svg>
  );
}

