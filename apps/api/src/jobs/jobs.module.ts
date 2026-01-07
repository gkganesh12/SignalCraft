import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
    imports: [ScheduleModule.forRoot()], // Ensure ScheduleModule is available if not global, but it is global in AppModule.
    providers: [CleanupService],
    exports: [CleanupService],
})
export class JobsModule { }
