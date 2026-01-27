import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@signalcraft/database';
import crypto from 'crypto';
import { OnCallService } from '../oncall/oncall.service';
import { SlackNotificationService } from '../notifications/slack-notification.service';
import { EmailNotificationService } from '../notifications/email-notification.service';
import { TwilioNotificationService } from '../notifications/twilio-notification.service';
import { QueueService } from '../queues/queue.service';

@Injectable()
export class PagingProcessor implements OnModuleDestroy {
  private readonly worker?: Worker;
  private readonly prismaClient = prisma as any;

  constructor(
    private readonly onCallService: OnCallService,
    private readonly slackService: SlackNotificationService,
    private readonly emailService: EmailNotificationService,
    private readonly twilioService: TwilioNotificationService,
    private readonly queueService: QueueService,
  ) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return;
    }

    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.worker = new Worker(
      'paging',
      async (job) => {
        const { workspaceId, policyId, alertGroupId, stepOrder, attemptNumber } = job.data as {
          workspaceId: string;
          policyId: string;
          alertGroupId: string;
          stepOrder: number;
          attemptNumber: number;
        };

        const policy = await this.prismaClient.pagingPolicy.findFirst({
          where: { id: policyId, workspaceId, enabled: true },
          include: { steps: { where: { order: stepOrder } } },
        });

        if (!policy || !policy.steps.length) {
          return { skipped: true };
        }

        const step = policy.steps[0];
        const alertGroup = await prisma.alertGroup.findFirst({
          where: { id: alertGroupId, workspaceId },
        });

        if (
          !alertGroup ||
          alertGroup.status === 'RESOLVED' ||
          alertGroup.status === 'ACK' ||
          alertGroup.status === 'SNOOZED'
        ) {
          return { skipped: true };
        }

        const onCallTargets = await this.onCallService.getOnCallTargets(
          workspaceId,
          policy.rotationId,
        );
        const targetUser = onCallTargets.primaryUser ?? null;
        const fullUser = targetUser?.id
          ? await prisma.user.findUnique({ where: { id: targetUser.id } })
          : null;
        const phoneNumber = (fullUser as { phoneNumber?: string } | null)?.phoneNumber;
        const alertUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/alerts/${alertGroup.id}`;
        const apiBaseUrl =
          process.env.API_PUBLIC_URL || process.env.BACKEND_URL || 'http://localhost:5050';
        const alertSummary = `${alertGroup.title} (${alertGroup.severity}) in ${alertGroup.environment}/${alertGroup.project}.`;

        const attempts = [] as Array<{
          channel: string;
          status: string;
          errorMessage?: string;
          ackToken?: string | null;
        }>;
        for (const channel of step.channels) {
          try {
            if (channel === 'SLACK') {
              await this.slackService.sendAlert(workspaceId, alertGroup.id);
              attempts.push({ channel, status: 'SENT' });
            } else if (channel === 'EMAIL') {
              if (!targetUser?.email) {
                attempts.push({
                  channel,
                  status: 'FAILED',
                  errorMessage: 'Target user email missing',
                });
              } else {
                await this.emailService.sendEscalationEmail(
                  workspaceId,
                  targetUser.email,
                  alertGroup.title,
                  alertGroup.title,
                  alertGroup.severity,
                  stepOrder + 1,
                  alertUrl,
                );
                attempts.push({ channel, status: 'SENT' });
              }
            } else if (channel === 'SMS') {
              if (!phoneNumber) {
                attempts.push({
                  channel,
                  status: 'FAILED',
                  errorMessage: 'Target user phone missing',
                });
              } else {
                const ackToken = this.generateAckToken();
                const ok = await this.twilioService.sendSms(
                  workspaceId,
                  phoneNumber,
                  `SignalCraft: ${alertSummary} Reply ACK ${ackToken} to acknowledge. ${alertUrl}`,
                );
                attempts.push({
                  channel,
                  status: ok ? 'SENT' : 'FAILED',
                  ackToken: ok ? ackToken : null,
                });
              }
            } else if (channel === 'VOICE') {
              if (!phoneNumber) {
                attempts.push({
                  channel,
                  status: 'FAILED',
                  errorMessage: 'Target user phone missing',
                });
              } else {
                const ackToken = this.generateAckToken();
                const twimlUrl = `${apiBaseUrl}/api/v1/twilio/voice?token=${ackToken}`;
                const ok = await this.twilioService.placeCall(
                  workspaceId,
                  phoneNumber,
                  `SignalCraft alert. ${alertSummary}`,
                  { twimlUrl },
                );
                attempts.push({
                  channel,
                  status: ok ? 'SENT' : 'FAILED',
                  ackToken: ok ? ackToken : null,
                });
              }
            } else {
              attempts.push({ channel, status: 'FAILED', errorMessage: 'Channel not configured' });
            }
          } catch (error) {
            attempts.push({
              channel,
              status: 'FAILED',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        const shadowAttempts: Array<{
          channel: string;
          status: string;
          errorMessage?: string;
          targetUserId?: string | null;
        }> = [];

        for (const shadowUser of onCallTargets.shadowUsers) {
          const shadowFull = await prisma.user.findUnique({ where: { id: shadowUser.id } });
          const shadowPhone = (shadowFull as { phoneNumber?: string } | null)?.phoneNumber;

          for (const channel of step.channels) {
            try {
              if (channel === 'SLACK') {
                await this.slackService.sendAlert(workspaceId, alertGroup.id);
                shadowAttempts.push({ channel, status: 'SENT', targetUserId: shadowUser.id });
              } else if (channel === 'EMAIL') {
                if (!shadowUser.email) {
                  shadowAttempts.push({
                    channel,
                    status: 'FAILED',
                    errorMessage: 'Target user email missing',
                    targetUserId: shadowUser.id,
                  });
                } else {
                  await this.emailService.sendEscalationEmail(
                    workspaceId,
                    shadowUser.email,
                    alertGroup.title,
                    alertGroup.title,
                    alertGroup.severity,
                    stepOrder + 1,
                    alertUrl,
                  );
                  shadowAttempts.push({ channel, status: 'SENT', targetUserId: shadowUser.id });
                }
              } else if (channel === 'SMS') {
                if (!shadowPhone) {
                  shadowAttempts.push({
                    channel,
                    status: 'FAILED',
                    errorMessage: 'Target user phone missing',
                    targetUserId: shadowUser.id,
                  });
                } else {
                  const ok = await this.twilioService.sendSms(
                    workspaceId,
                    shadowPhone,
                    `SignalCraft (shadow): ${alertSummary} ${alertUrl}`,
                  );
                  shadowAttempts.push({
                    channel,
                    status: ok ? 'SENT' : 'FAILED',
                    targetUserId: shadowUser.id,
                  });
                }
              } else if (channel === 'VOICE') {
                if (!shadowPhone) {
                  shadowAttempts.push({
                    channel,
                    status: 'FAILED',
                    errorMessage: 'Target user phone missing',
                    targetUserId: shadowUser.id,
                  });
                } else {
                  const ok = await this.twilioService.placeCall(
                    workspaceId,
                    shadowPhone,
                    `SignalCraft shadow alert. ${alertSummary}`,
                  );
                  shadowAttempts.push({
                    channel,
                    status: ok ? 'SENT' : 'FAILED',
                    targetUserId: shadowUser.id,
                  });
                }
              }
            } catch (error) {
              shadowAttempts.push({
                channel,
                status: 'FAILED',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                targetUserId: shadowUser.id,
              });
            }
          }
        }

        await prisma.$transaction([
          ...attempts.map((attempt) =>
            this.prismaClient.pagingAttempt.create({
              data: {
                policyId,
                alertGroupId,
                channel: attempt.channel as any,
                status: attempt.status as any,
                targetUserId: targetUser?.id ?? null,
                stepOrder,
                attemptNumber,
                errorMessage: attempt.errorMessage,
                ackToken: attempt.ackToken ?? null,
                completedAt: new Date(),
              },
            }),
          ),
          ...shadowAttempts.map((attempt) =>
            this.prismaClient.pagingAttempt.create({
              data: {
                policyId,
                alertGroupId,
                channel: attempt.channel as any,
                status: attempt.status as any,
                targetUserId: attempt.targetUserId ?? null,
                stepOrder,
                attemptNumber,
                errorMessage: attempt.errorMessage,
                completedAt: new Date(),
                ackSource: 'shadow',
              },
            }),
          ),
        ]);

        if (step.repeatCount > attemptNumber) {
          const delaySeconds = step.repeatIntervalSeconds > 0 ? step.repeatIntervalSeconds : 300;
          await this.queueService.addJob(
            'paging',
            'paging-step',
            {
              workspaceId,
              policyId,
              alertGroupId,
              stepOrder,
              attemptNumber: attemptNumber + 1,
            },
            { delay: delaySeconds * 1000 },
          );
        }

        const nextStep = await this.prismaClient.pagingStep.findFirst({
          where: { policyId, order: stepOrder + 1 },
        });

        if (nextStep && attemptNumber === 1) {
          await this.queueService.addJob(
            'paging',
            'paging-step',
            {
              workspaceId,
              policyId,
              alertGroupId,
              stepOrder: nextStep.order,
              attemptNumber: 1,
            },
            { delay: Math.max(nextStep.delaySeconds, 0) * 1000 },
          );
        }

        return { processed: true };
      },
      { connection },
    );
  }

  private generateAckToken() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
