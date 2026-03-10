export interface StatusTransitionRule {
  from: string | string[];
  to: string;
  requiredPermission?: string;
}

export interface StatusTransitionMap {
  [entity: string]: StatusTransitionRule[];
}

export interface TransitionResult {
  allowed: boolean;
  from: string;
  to: string;
  reason?: string;
}
