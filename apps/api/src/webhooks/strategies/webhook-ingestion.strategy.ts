export interface WebhookIngestionResult {
  duplicate: boolean;
  groupId?: string;
  eventId?: string;
  rulesEvaluated?: number;
  rulesMatched?: number;
  notificationsQueued?: number;
  escalationsScheduled?: number;
}

export interface WebhookIngestionContext {
  workspaceId: string;
  payload: Record<string, unknown>;
}

export interface WebhookIngestionStrategy {
  readonly source: string;
  canHandle(source: string): boolean;
  ingest(context: WebhookIngestionContext): Promise<WebhookIngestionResult[]>;
}
