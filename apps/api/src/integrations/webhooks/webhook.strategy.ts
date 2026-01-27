import { AlertSeverity } from '@signalcraft/database';

export interface NormalizedAlert {
    title: string;
    message: string;
    severity: AlertSeverity;
    sourceEventId: string;
    description?: string;
    tags?: Record<string, string>;
    link?: string;
}

export interface WebhookStrategy {
    /**
     * Parse the incoming webhook payload into a normalized alert
     */
    parse(payload: any, headers?: Record<string, string>, config?: any): Promise<NormalizedAlert | null>;

    /**
     * Validate the webhook signature or token
     */
    validate(payload: any, headers?: Record<string, string>, secret?: string): boolean;
}
