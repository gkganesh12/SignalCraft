import { Injectable } from '@nestjs/common';
import { AlertSeverity, AlertStatus, Prisma, prisma } from '@signalcraft/database';
import { z } from 'zod';
import { AiService } from '../ai/ai.service';

const aiQuerySchema = z.object({
  statuses: z.array(z.string()).optional().nullable(),
  severities: z.array(z.string()).optional().nullable(),
  project: z.string().optional().nullable(),
  environment: z.string().optional().nullable(),
  since: z.string().optional().nullable(),
  until: z.string().optional().nullable(),
  keywords: z.array(z.string()).optional().nullable(),
  limit: z.number().int().positive().optional().nullable(),
});

type AiQueryPayload = z.infer<typeof aiQuerySchema>;

export interface ParsedQuery {
  query: string;
  statuses?: AlertStatus[];
  severities?: AlertSeverity[];
  project?: string;
  environment?: string;
  since?: Date;
  until?: Date;
  keywords: string[];
  limit?: number;
  source?: 'ai' | 'heuristic';
}

export interface ChatOpsQueryResult {
  id: string;
  title: string;
  severity: string;
  status: string;
  project: string;
  environment: string;
  lastSeenAt: Date;
}

@Injectable()
export class ChatOpsService {
  private readonly keywordHints = [
    'latency',
    'timeout',
    'error',
    'exception',
    'db',
    'payment',
    'payments',
  ];

  constructor(private readonly aiService: AiService) {}

  async query(workspaceId: string, query: string, limit = 20) {
    const heuristic = this.parseQuery(query);
    const aiParsed = await this.parseQueryWithAi(query);
    const parsed = aiParsed ? this.mergeParsedQueries(aiParsed, heuristic) : heuristic;
    const where: Prisma.AlertGroupWhereInput = {
      workspaceId,
      ...(parsed.project ? { project: parsed.project } : {}),
      ...(parsed.environment ? { environment: parsed.environment } : {}),
      ...(parsed.statuses?.length ? { status: { in: parsed.statuses } } : {}),
      ...(parsed.severities?.length ? { severity: { in: parsed.severities } } : {}),
      ...(parsed.since || parsed.until
        ? {
            lastSeenAt: {
              ...(parsed.since ? { gte: parsed.since } : {}),
              ...(parsed.until ? { lte: parsed.until } : {}),
            },
          }
        : {}),
    };

    if (parsed.keywords.length > 0) {
      where.OR = parsed.keywords.map((keyword) => ({
        title: { contains: keyword, mode: 'insensitive' },
      }));
    }

    const results = await prisma.alertGroup.findMany({
      where,
      orderBy: { lastSeenAt: 'desc' },
      take: Math.min(parsed.limit ?? limit, 50),
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        project: true,
        environment: true,
        lastSeenAt: true,
      },
    });

    return {
      filters: parsed,
      results: results as ChatOpsQueryResult[],
    };
  }

  private parseQuery(query: string): ParsedQuery {
    const normalized = query.toLowerCase();
    const statuses: AlertStatus[] = [];
    const severities: AlertSeverity[] = [];

    if (normalized.includes('open')) statuses.push(AlertStatus.OPEN);
    if (normalized.includes('ack')) statuses.push(AlertStatus.ACK);
    if (normalized.includes('snooz')) statuses.push(AlertStatus.SNOOZED);
    if (normalized.includes('resolved')) statuses.push(AlertStatus.RESOLVED);

    if (normalized.includes('critical')) severities.push(AlertSeverity.CRITICAL);
    if (normalized.includes('high')) severities.push(AlertSeverity.HIGH);
    if (normalized.includes('medium') || normalized.includes('med '))
      severities.push(AlertSeverity.MEDIUM);
    if (normalized.includes('low')) severities.push(AlertSeverity.LOW);
    if (normalized.includes('info')) severities.push(AlertSeverity.INFO);

    const timeMatch = normalized.match(/last\s+(\d+)\s*(h|hour|hours|d|day|days|w|week|weeks)/);
    let since: Date | undefined;
    if (timeMatch) {
      const value = parseInt(timeMatch[1], 10);
      const unit = timeMatch[2];
      const hours = unit.startsWith('h')
        ? value
        : unit.startsWith('d')
          ? value * 24
          : value * 24 * 7;
      since = new Date(Date.now() - hours * 60 * 60 * 1000);
    }

    if (!since && normalized.includes('today')) {
      since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    let environment: string | undefined;
    if (normalized.includes('production') || normalized.includes('prod'))
      environment = 'production';
    if (normalized.includes('staging')) environment = 'staging';
    if (normalized.includes('dev') || normalized.includes('development'))
      environment = 'development';

    const projectMatch = normalized.match(/(?:project|service)\s+([a-z0-9-_]+)/);
    const project = projectMatch?.[1];

    const keywords = this.keywordHints.filter((hint) => normalized.includes(hint));

    return {
      query,
      statuses: statuses.length ? statuses : undefined,
      severities: severities.length ? severities : undefined,
      project,
      environment,
      since,
      until: undefined,
      keywords,
      source: 'heuristic',
    };
  }

  private async parseQueryWithAi(query: string): Promise<ParsedQuery | null> {
    if (!this.aiService.isEnabled()) {
      return null;
    }

    const prompt = `You convert natural language alert queries into JSON filters for a Prisma AlertGroup search.
Return ONLY valid JSON with these keys: statuses, severities, project, environment, since, until, keywords, limit.
- statuses: array of OPEN, ACK, SNOOZED, RESOLVED (or null)
- severities: array of CRITICAL, HIGH, MEDIUM, LOW, INFO (or null)
- environment: production, staging, development, or null
- since/until: ISO 8601 UTC timestamps (YYYY-MM-DDTHH:mm:ssZ) or null
- keywords: array of short terms (service names, error types) or null
- limit: integer 1-50 or null
If a value is not specified, use null.
Current time: ${new Date().toISOString()}
Query: "${query}"
JSON:`;

    const response = await this.aiService.generateContent(prompt);
    const parsed = this.safeJsonParse(response);
    const validation = aiQuerySchema.safeParse(parsed);
    if (!validation.success) {
      return null;
    }

    return this.normalizeAiQuery(validation.data, query);
  }

  private normalizeAiQuery(payload: AiQueryPayload, query: string): ParsedQuery | null {
    const statuses = this.normalizeStatusValues(payload.statuses ?? undefined);
    const severities = this.normalizeSeverityValues(payload.severities ?? undefined);
    const project = payload.project?.trim() || undefined;
    const environment = this.normalizeEnvironment(payload.environment ?? undefined);
    const since = this.parseIsoDate(payload.since ?? undefined);
    const until = this.parseIsoDate(payload.until ?? undefined);
    const keywords = (payload.keywords ?? [])
      .map((keyword) => keyword.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8);
    const limit = payload.limit ? Math.min(Math.max(payload.limit, 1), 50) : undefined;

    return {
      query,
      statuses,
      severities,
      project,
      environment,
      since,
      until,
      keywords,
      limit,
      source: 'ai',
    };
  }

  private mergeParsedQueries(primary: ParsedQuery, fallback: ParsedQuery): ParsedQuery {
    const mergedKeywords = Array.from(
      new Set([...(primary.keywords ?? []), ...(fallback.keywords ?? [])]),
    );

    return {
      query: primary.query || fallback.query,
      statuses: primary.statuses ?? fallback.statuses,
      severities: primary.severities ?? fallback.severities,
      project: primary.project ?? fallback.project,
      environment: primary.environment ?? fallback.environment,
      since: primary.since ?? fallback.since,
      until: primary.until ?? fallback.until,
      keywords: mergedKeywords,
      limit: primary.limit ?? fallback.limit,
      source: primary.source ?? fallback.source,
    };
  }

  private normalizeStatusValues(values?: string[] | null): AlertStatus[] | undefined {
    if (!values || values.length === 0) return undefined;
    const mapping: Record<string, AlertStatus> = {
      open: AlertStatus.OPEN,
      opened: AlertStatus.OPEN,
      ack: AlertStatus.ACK,
      acknowledged: AlertStatus.ACK,
      snooze: AlertStatus.SNOOZED,
      snoozed: AlertStatus.SNOOZED,
      resolved: AlertStatus.RESOLVED,
      closed: AlertStatus.RESOLVED,
    };
    const normalized = values
      .map((value) => {
        const key = value.toLowerCase();
        if (mapping[key]) return mapping[key];
        const upper = value.toUpperCase();
        return (Object.values(AlertStatus) as string[]).includes(upper)
          ? (upper as AlertStatus)
          : undefined;
      })
      .filter((value): value is AlertStatus => Boolean(value));

    return normalized.length ? Array.from(new Set(normalized)) : undefined;
  }

  private normalizeSeverityValues(values?: string[] | null): AlertSeverity[] | undefined {
    if (!values || values.length === 0) return undefined;
    const mapping: Record<string, AlertSeverity> = {
      critical: AlertSeverity.CRITICAL,
      high: AlertSeverity.HIGH,
      medium: AlertSeverity.MEDIUM,
      med: AlertSeverity.MEDIUM,
      low: AlertSeverity.LOW,
      info: AlertSeverity.INFO,
      informational: AlertSeverity.INFO,
    };
    const normalized = values
      .map((value) => {
        const key = value.toLowerCase();
        if (mapping[key]) return mapping[key];
        const upper = value.toUpperCase();
        return (Object.values(AlertSeverity) as string[]).includes(upper)
          ? (upper as AlertSeverity)
          : undefined;
      })
      .filter((value): value is AlertSeverity => Boolean(value));

    return normalized.length ? Array.from(new Set(normalized)) : undefined;
  }

  private normalizeEnvironment(value?: string | null) {
    if (!value) return undefined;
    const normalized = value.toLowerCase();
    if (normalized === 'prod' || normalized === 'production') return 'production';
    if (normalized === 'stage' || normalized === 'staging') return 'staging';
    if (normalized === 'dev' || normalized === 'development') return 'development';
    return value.trim();
  }

  private parseIsoDate(value?: string | null): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    return parsed;
  }

  private safeJsonParse(text: string): unknown | null {
    if (!text) return null;
    const trimmed = text.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}
