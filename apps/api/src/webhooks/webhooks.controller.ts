import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import crypto from 'crypto';
import { AlertProcessorService } from '../alerts/alert-processor.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly alertProcessor: AlertProcessorService) {}

  @Post('sentry')
  async handleSentryWebhook(
    @Req() req: { body: Buffer },
    @Body() parsedBody: unknown,
    @Headers('x-sentry-hook-signature') signature: string | undefined,
    @Headers('x-workspace-id') workspaceHeader: string | undefined,
    @Query('workspaceId') workspaceQuery: string | undefined,
  ) {
    const workspaceId = workspaceHeader ?? workspaceQuery;
    if (!workspaceId) {
      throw new BadRequestException('Missing workspaceId');
    }

    const rawBody = req.body?.toString('utf8') ?? '';
    let payload = parsedBody;
    if (rawBody) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        throw new BadRequestException('Invalid JSON payload');
      }
    }

    this.verifySentrySignature(rawBody, signature);

    this.logger.log(`Sentry webhook received`, {
      workspaceId,
      payloadSize: rawBody.length,
    });

    const result = await this.alertProcessor.processSentryEvent({
      workspaceId,
      payload: payload as Record<string, unknown>,
    });

    return { status: 'ok', ...result };
  }

  private verifySentrySignature(rawBody: string, signature?: string) {
    const secret = process.env.SENTRY_WEBHOOK_SECRET;
    if (!secret) {
      return;
    }

    if (!signature) {
      throw new BadRequestException('Missing Sentry signature');
    }

    const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const digestBuffer = Buffer.from(digest);
    const signatureBuffer = Buffer.from(signature);
    if (digestBuffer.length !== signatureBuffer.length) {
      throw new BadRequestException('Invalid Sentry signature');
    }
    const valid = crypto.timingSafeEqual(digestBuffer, signatureBuffer);
    if (!valid) {
      throw new BadRequestException('Invalid Sentry signature');
    }
  }
}
