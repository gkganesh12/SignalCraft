/**
 * Dashboard Module
 * 
 * @module dashboard/dashboard.module
 */
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
    imports: [
        CacheModule.register({
            ttl: 60000, // 60 seconds default
            max: 100, // max items
        }),
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
    exports: [DashboardService],
})
export class DashboardModule { }
