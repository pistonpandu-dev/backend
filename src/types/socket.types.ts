export interface SocketUser {
  id: string;
  role: string;
}

export interface SocketData {
  user: SocketUser;
  sessionId: string;
}

export interface SocketEvent<T = any> {
  event: string;
  data: T;
  timestamp: string;
}

export interface DeviceOnlineEvent {
  deviceId: string;
  deviceName: string;
  timestamp: string;
}

export interface DeviceOfflineEvent {
  deviceId: string;
  deviceName: string;
  lastSeen: string;
}

export interface BatteryUpdateEvent {
  deviceId: string;
  batteryLevel: number;
  chargingStatus: boolean;
  timestamp: string;
}

export interface LocationUpdateEvent {
  deviceId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

export interface NotificationEvent {
  id: string;
  title: string;
  message: string;
  type: string;
  metadata?: any;
  createdAt: string;
}

export interface SecurityAlertEvent {
  id: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  createdAt: string;
}
