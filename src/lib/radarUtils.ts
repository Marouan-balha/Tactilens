export interface RadarPlayer {
  id: number;
  team: number;
  x: number;
  y: number;
}

export interface RadarBall {
  x: number;
  y: number;
}

export interface RadarFrameData {
  players: RadarPlayer[];
  ball: RadarBall | null;
}

export interface RadarStreamData {
  fps: number;
  pitchLength: number;
  pitchWidth: number;
  frames: Record<string, RadarFrameData>;
}

export function getRadarFrameForTime(
  data: RadarStreamData | null,
  timeSeconds: number
): RadarFrameData | null {
  if (!data || !data.frames) return null;

  const fps = data.fps || 25;
  const rawFrameIndex = Math.floor(timeSeconds * fps);
  
  // Find nearest available sampled frame key (sampled every 5 frames)
  const sampledFrameIndex = Math.floor(rawFrameIndex / 5) * 5;
  const key = String(sampledFrameIndex);

  if (data.frames[key]) {
    return data.frames[key];
  }

  // Fallback to nearest lower frame key
  const availableKeys = Object.keys(data.frames).map(Number).sort((a, b) => a - b);
  if (availableKeys.length === 0) return null;

  let closestKey = availableKeys[0];
  for (const k of availableKeys) {
    if (k <= rawFrameIndex) closestKey = k;
    else break;
  }

  return data.frames[String(closestKey)] || null;
}
