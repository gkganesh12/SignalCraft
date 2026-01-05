import { Module, forwardRef } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { NormalizationService } from './normalization.service';
import { GroupingService } from './grouping.service';
import { AlertProcessorService } from './alert-processor.service';
import { QueueModule } from '../queues/queue.module';
import { HygieneService } from './hygiene/hygiene.service';
import { HygieneController } from './hygiene/hygiene.controller';
import { HygieneSchedulerService } from './hygiene/hygiene-scheduler.service';
import { HygieneProcessor } from './hygiene/hygiene.processor';
import { EscalationsModule } from '../escalations/escalations.module';
import { RoutingModule } from '../routing/routing.module';

@Module({
  imports: [
    QueueModule,
    forwardRef(() => EscalationsModule),
    forwardRef(() => RoutingModule),
  ],
  controllers: [AlertsController, HygieneController],
  providers: [
    AlertsService,
    NormalizationService,
    GroupingService,
    AlertProcessorService,
    HygieneService,
    HygieneSchedulerService,
    HygieneProcessor,
  ],
  exports: [AlertProcessorService, AlertsService, HygieneService],
})
export class AlertsModule { }


