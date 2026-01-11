import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { EncryptionService } from './encryption.service';
import { SlackOAuthService } from './slack/oauth.service';
import { SlackService } from './slack/slack.service';

@Module({
  controllers: [IntegrationsController],
  providers: [EncryptionService, SlackOAuthService, SlackService],
  exports: [SlackOAuthService, SlackService],
})
export class IntegrationsModule {}
