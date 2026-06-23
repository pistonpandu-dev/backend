import { DeviceStatus } from '@prisma/client';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  brand?: string;
  model?: string;
  androidVersion?: string;
  sdkVersion?: string;
  serialNumber?: string;
  screenResolution?: string;
  batteryHealth?: number;
  totalStorage?: number;
  freeStorage?: number;
  ramTotal?: number;
  ramFree?: number;
  cpuInfo?: string;
  networkInfo?: string;
  fcmToken?: string;
}

export interface DeviceWithStatus extends DeviceInfo {
  status: DeviceStatus;
  lastSeen: Date;
  trustScore: number;
  verificationLevel: string;
  isCompromised: boolean;
}

export interface DeviceFilter {
  search?: string;
  status?: DeviceStatus;
  groupId?: string;
  tagId?: string;
  brand?: string;
  model?: string;
  fromDate?: Date;
  toDate?: Date;
  trustScoreMin?: number;
  trustScoreMax?: number;
}

export interface DevicePagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DeviceVerificationResult {
  verified: boolean;
  score: number;
  reasons: string[];
}

export interface DeviceAction {
  type: 'notify' | 'ring' | 'lost_mode' | 'lock' | 'restart' | 'message';
  data: any;
}
