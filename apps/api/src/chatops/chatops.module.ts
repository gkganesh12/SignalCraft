import { Module } from '@nestjs/common';
import { ChatOpsController } from './chatops.controller';
import { ChatOpsService } from './chatops.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [ChatOpsController],
  providers: [ChatOpsService],
})
export class ChatOpsModule {}
