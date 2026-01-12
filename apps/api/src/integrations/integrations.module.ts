import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { SlackController } from './slack.controller';
import { PagerDutyService } from './pagerduty.service';
import { PagerDutyController } from './pagerduty.controller';
import { OpsgenieService } from './opsgenie.service';
import { OpsgenieController } from './opsgenie.controller';

@Module({
  controllers: [IntegrationsController, SlackController, PagerDutyController, OpsgenieController],
  providers: [IntegrationsService, PagerDutyService, OpsgenieService],
  exports: [IntegrationsService, PagerDutyService, OpsgenieService],
})
export class IntegrationsModule { }
