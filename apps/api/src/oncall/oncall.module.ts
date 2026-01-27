import { Module } from '@nestjs/common';
import { OnCallController } from './oncall.controller';
import { OnCallService } from './oncall.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [OnCallController],
  providers: [OnCallService],
  exports: [OnCallService],
})
export class OnCallModule {}
