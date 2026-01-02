import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('integrations')
@Controller('integrations')
export class IntegrationsController {
  @Get('sentry/health')
  health() {
    return { status: 'ok', source: 'sentry' };
  }
}
