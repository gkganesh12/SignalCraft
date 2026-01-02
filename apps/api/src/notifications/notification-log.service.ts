import { Injectable } from '@nestjs/common';
import { prisma, NotificationStatus, NotificationTarget } from '@signalcraft/database';

@Injectable()
export class NotificationLogService {
  async logSuccess(workspaceId: string, channelId: string, alertGroupId: string) {
    return prisma.notificationLog.create({
      data: {
        workspaceId,
        target: NotificationTarget.SLACK,
        targetRef: channelId,
        alertGroupId,
        status: NotificationStatus.SENT,
      },
    });
  }

  async logFailure(
    workspaceId: string,
    channelId: string,
    alertGroupId: string,
    errorMessage: string,
  ) {
    return prisma.notificationLog.create({
      data: {
        workspaceId,
        target: NotificationTarget.SLACK,
        targetRef: channelId,
        alertGroupId,
        status: NotificationStatus.FAILED,
        errorMessage,
      },
    });
  }
}
