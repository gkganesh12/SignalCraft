import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { NormalizationService } from './normalization.service';
import { GroupingService } from './grouping.service';
import { AlertProcessorService } from './alert-processor.service';
import { QueueModule } from '../queues/queue.module';

@Module({
  imports: [QueueModule],
  controllers: [AlertsController],
  providers: [AlertsService, NormalizationService, GroupingService, AlertProcessorService],
  exports: [AlertProcessorService, AlertsService],
})
export class AlertsModule {}
