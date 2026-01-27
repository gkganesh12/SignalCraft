import { Module, forwardRef } from '@nestjs/common';
import { PagingController } from './paging.controller';
import { PagingService } from './paging.service';
import { PagingProcessor } from './paging.processor';
import { QueueModule } from '../queues/queue.module';
import { OnCallModule } from '../oncall/oncall.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [QueueModule, forwardRef(() => OnCallModule), NotificationsModule, AuditModule],
  controllers: [PagingController],
  providers: [PagingService, PagingProcessor],
  exports: [PagingService],
})
export class PagingModule {}
