import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { prisma, NotificationStatus } from '@signalcraft/database';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('notifications')
export class NotificationsController {
  @Get('health')
  async health(@CurrentUser() user: { clerkId: string }) {
    const workspaceId = await this.getWorkspaceId(user.clerkId);
    const [lastSuccess, lastFailure] = await Promise.all([
      prisma.notificationLog.findFirst({
        where: { workspaceId, status: 'SENT' },
        orderBy: { sentAt: 'desc' },
      }),
      prisma.notificationLog.findFirst({
        where: { workspaceId, status: 'FAILED' },
        orderBy: { sentAt: 'desc' },
      }),
    ]);

    return {
      lastSuccessAt: lastSuccess?.sentAt ?? null,
      lastFailureAt: lastFailure?.sentAt ?? null,
    };
  }

  @Get('logs')
  async logs(
    @CurrentUser() user: { clerkId: string },
    @Query('status') status?: string,
  ) {
    const workspaceId = await this.getWorkspaceId(user.clerkId);
    return prisma.notificationLog.findMany({
      where: {
        workspaceId,
        status: this.normalizeStatus(status),
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
  }

  private async getWorkspaceId(clerkId: string) {
    const dbUser = await prisma.user.findUnique({ where: { clerkId } });
    if (!dbUser) {
      throw new Error('Workspace not found');
    }
    return dbUser.workspaceId;
  }

  private normalizeStatus(status?: string): NotificationStatus | undefined {
    if (!status) {
      return undefined;
    }
    const value = status.toUpperCase();
    if (Object.values(NotificationStatus).includes(value as NotificationStatus)) {
      return value as NotificationStatus;
    }
    return undefined;
  }
}
