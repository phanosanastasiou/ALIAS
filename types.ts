export enum AppMode {
  LOCK_SCREEN = 'LOCK_SCREEN',
  CAMOUFLAGE = 'CAMOUFLAGE',
  CALL_ACTIVE = 'CALL_ACTIVE',
}

export enum DistressLevel {
  SAFE = 0,
  LEVEL_1_DETERRENT = 1,
  LEVEL_2_ALERT = 2,
  LEVEL_3_SOS = 3,
}

export interface LocationData {
  latitude: number;
  longitude: number;
}

export interface Contact {
  id: string;
  name: string;
  type: string; // e.g. 'mobile', 'home'
}

export interface BackgroundNoise {
  id: string;
  name: string;
  url: string;
}

// Live API specific types
export interface ToolResponse {
  functionResponses: {
    id: string;
    name: string;
    response: object;
  }[];
}