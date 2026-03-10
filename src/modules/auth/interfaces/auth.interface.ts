export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
}

export interface SessionInfo {
  id: string;
  ipAddress: string;
  userAgent: string;
  lastSeenAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

export interface LoginAttemptResult {
  success: boolean;
  locked: boolean;
  remainingAttempts?: number;
}
