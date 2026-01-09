import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { SlackController } from './slack.controller';
import { PagerDutyService } from './pagerduty.service';
import { PagerDutyController } from './pagerduty.controller';

@Module({
  controllers: [IntegrationsController, SlackController, PagerDutyController],
  providers: [IntegrationsService, PagerDutyService],
  exports: [IntegrationsService, PagerDutyService],
})
export class IntegrationsModule { }
