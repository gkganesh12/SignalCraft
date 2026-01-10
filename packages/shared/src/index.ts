export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface WorkspaceRef {
  id: string;
  name: string;
}

export interface UserRef {
  id: string;
  email: string;
  displayName: string | null;
}

export type AlertSeverity = 'info' | 'low' | 'med' | 'high' | 'critical';

export interface NormalizedAlert {
  source: string;
  sourceEventId: string;
  project: string;
  environment: string;
  severity: AlertSeverity;
  fingerprint: string;
  title: string;
  description: string;
  tags: Record<string, string>;
  occurredAt: Date;
  link: string | null;
}
