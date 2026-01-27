import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  MaxLength,
  IsUrl,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaxJsonDepth, IsSafeUrl, IsSanitized } from '../../common/validators/custom-validators';

/**
 * Base DTO for webhook ingestion with security validations
 */
export class IngestWebhookDto {
  @ApiProperty({ description: 'Unique identifier for the event', example: 'evt_12345' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500, { message: 'Event ID too long (max 500 characters)' })
  eventId!: string;

  @ApiProperty({ description: 'Name of the project', example: 'api-service' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200, { message: 'Project name too long (max 200 characters)' })
  @IsSanitized({ message: 'Project name contains invalid characters' })
  project!: string;

  @ApiProperty({ description: 'Environment name', example: 'production' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Environment name too long (max 100 characters)' })
  @IsSanitized()
  environment!: string;

  @ApiProperty({ description: 'Short title of the alert', example: 'Database connection failed' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, { message: 'Title too long (max 1000 characters)' })
  @IsSanitized()
  title!: string;

  @ApiProperty({
    description: 'Detailed alert message',
    example: 'Service failed to connect to db:5432 after 3 retries',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, { message: 'Message too long (max 5000 characters)' })
  @IsSanitized()
  message!: string;

  @ApiProperty({
    description: 'Alert severity level',
    enum: ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  severity!: string;

  @ApiPropertyOptional({ description: 'Fingerprint for deduplication', example: 'db-conn-error' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fingerprint?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata tags',
    example: { host: 'node-1', region: 'us-east-1' },
  })
  @IsOptional()
  @IsObject()
  @MaxJsonDepth(5, { message: 'Tags JSON nesting too deep (max 5 levels)' })
  tags?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Raw event payload', example: { details: '...' } })
  @IsOptional()
  @IsObject()
  @MaxJsonDepth(10, { message: 'Payload JSON nesting too deep (max 10 levels)' })
  payload?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Source URL of the alert',
    example: 'https://sentry.io/events/123',
  })
  @IsOptional()
  @IsString()
  @IsSafeUrl()
  @MaxLength(2048)
  url?: string;

  @ApiPropertyOptional({
    description: 'User associated with the event',
    example: 'admin@company.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  user?: string;

  @ApiPropertyOptional({ description: 'IP address of the source', example: '192.168.1.1' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  ipAddress?: string;
}

/**
 * Sentry-specific webhook DTO
 */
export class SentryWebhookDto {
  @ApiProperty({ description: 'Sentry project numeric ID', example: '123' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ description: 'Sentry project slug', example: 'my-project' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  project!: string;

  @ApiProperty({ description: 'Sentry event details' })
  @IsObject()
  @MaxJsonDepth(8)
  event!: {
    id: string;
    title: string;
    message?: string;
    level: string;
    platform?: string;
    timestamp: string;
    environment?: string;
    fingerprint?: string[];
    tags?: Record<string, any>;
    [key: string]: any;
  };
}

/**
 * Datadog webhook DTO
 */
export class DatadogWebhookDto {
  @ApiProperty({ description: 'Datadog event ID', example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ description: 'Alert title', example: 'High CPU usage on web-1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsSanitized()
  title!: string;

  @ApiPropertyOptional({ description: 'Alert detailed message body' })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  @IsSanitized()
  body?: string;

  @ApiProperty({ description: 'Type of alert', example: 'error' })
  @IsString()
  @IsNotEmpty()
  alert_type!: string;

  @ApiProperty({ description: 'Alert priority', example: 'high' })
  @IsString()
  @IsNotEmpty()
  priority!: string;

  @ApiPropertyOptional({
    description: 'List of Datadog tags',
    example: ['service:web', 'env:prod'],
  })
  @IsOptional()
  @IsObject() // This might be problematic for arrays unless configured, but let's just use flexible typing or custom validator if needed. actually, let's remove strict Object check or allow array.
  // However, simplest fix for now: Allow any. Or since we know normalization handles array/string/object.
  // But wait, the previous error was explicit.
  // Let's change type to `any`.
  tags?: any;

  @ApiPropertyOptional({ description: 'Direct link to Datadog event' })
  @IsOptional()
  @IsString()
  @IsSafeUrl()
  link?: string;
}

/**
 * Prometheus Alertmanager webhook DTO
 */
export class AlertmanagerWebhookDto {
  @ApiPropertyOptional({ description: 'Alertmanager receiver name', example: 'signalcraft' })
  @IsOptional()
  @IsString()
  receiver?: string;

  @ApiPropertyOptional({ description: 'Alert status', example: 'firing' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Alert list from Alertmanager' })
  @IsObject()
  alerts!: Array<{
    status?: string;
    labels?: Record<string, any>;
    annotations?: Record<string, any>;
    startsAt?: string;
    endsAt?: string;
    generatorURL?: string;
    fingerprint?: string;
  }>;
}

/**
 * Generic webhook configuration DTO
 */
export class WebhookConfigDto {
  @ApiProperty({ description: 'Human-readable name for the webhook', example: 'Production Alerts' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    description: 'Target URL for the webhook',
    example: 'https://hooks.slack.com/...',
  })
  @IsString()
  @IsUrl()
  @IsSafeUrl()
  @MaxLength(2048)
  url!: string;

  @ApiPropertyOptional({ description: 'Custom HTTP headers' })
  @IsOptional()
  @IsObject()
  @MaxJsonDepth(3)
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Secret key for signature verification' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  secret?: string;
}

/**
 * User input DTO with email validation
 */
export class CreateUserDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsSanitized()
  displayName!: string;

  @IsString()
  @IsNotEmpty()
  workspaceId!: string;
}
