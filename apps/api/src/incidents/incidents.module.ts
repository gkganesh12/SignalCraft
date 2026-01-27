import { Module, forwardRef } from '@nestjs/common';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { CollaborationService } from './collaboration.service';
import { PostmortemService } from './postmortem.service';
import { AlertsModule } from '../alerts/alerts.module';
import { AiModule } from '../ai/ai.module';
import { EventsModule } from '../common/websocket/events.module';

@Module({
    imports: [
        forwardRef(() => AlertsModule),
        AiModule,
        EventsModule,
    ],
    controllers: [IncidentsController],
    providers: [
        IncidentsService,
        CollaborationService,
        PostmortemService,
    ],
    exports: [
        IncidentsService,
        CollaborationService,
        PostmortemService,
    ],
})
export class IncidentsModule { }
