import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

interface WebhookActionConfig {
    url: string;
    method?: 'POST' | 'PUT';
    headers?: Record<string, string>;
    body?: Record<string, any>;
}

interface WebhookPayload {
    alertId: string;
    title: string;
    message: string;
    severity: string;
    project: string;
    environment: string;
    timestamp: string;
    [key: string]: any;
}

@Injectable()
export class WebhookDispatcherService {
    private readonly logger = new Logger(WebhookDispatcherService.name);

    /**
     * Dispatch a webhook with retry logic
     */
    async dispatch(
        config: WebhookActionConfig,
        payload: WebhookPayload,
    ): Promise<{ success: boolean; error?: string }> {
        const maxRetries = 3;
        let lastError: string | undefined;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await axios({
                    method: config.method || 'POST',
                    url: config.url,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'SignalCraft-Webhook/1.0',
                        ...config.headers,
                    },
                    data: config.body || payload,
                    timeout: 10000, // 10 second timeout
                });

                this.logger.log(`Webhook dispatched successfully to ${config.url} (${response.status})`);
                return { success: true };
            } catch (error: any) {
                const axiosError = error as AxiosError;
                lastError = axiosError.response
                    ? `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`
                    : axiosError.message || 'Unknown error';

                this.logger.warn(
                    `Webhook delivery attempt ${attempt}/${maxRetries} failed for ${config.url}: ${lastError}`,
                );

                if (attempt < maxRetries) {
                    // Exponential backoff: 1s, 2s, 4s
                    const delayMs = Math.pow(2, attempt - 1) * 1000;
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
            }
        }

        this.logger.error(`Webhook delivery failed after ${maxRetries} attempts: ${config.url}`);
        return { success: false, error: lastError };
    }

    /**
     * Validate webhook configuration
     */
    validateConfig(config: WebhookActionConfig): { valid: boolean; error?: string } {
        if (!config.url) {
            return { valid: false, error: 'URL is required' };
        }

        try {
            new URL(config.url);
        } catch {
            return { valid: false, error: 'Invalid URL format' };
        }

        if (config.method && !['POST', 'PUT'].includes(config.method)) {
            return { valid: false, error: 'Method must be POST or PUT' };
        }

        return { valid: true };
    }
}
