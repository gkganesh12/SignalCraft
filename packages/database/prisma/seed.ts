import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { PrismaClient, IntegrationStatus, IntegrationType, WorkspaceRole, AlertSeverity, AlertStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up existing data (optional - comment out if you want to preserve data)
  await prisma.notificationLog.deleteMany();
  await prisma.alertEvent.deleteMany();
  await prisma.alertGroup.deleteMany();
  await prisma.routingRule.deleteMany();
  // await prisma.correlationRule.deleteMany(); // Table doesn't exist yet
  await prisma.integration.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();
  console.log('🧹 Cleaned existing data');

  // Create workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'SignalCraft Demo',
      highImpactUserThreshold: 50,
      mediumImpactUserThreshold: 10,
      highVelocityThreshold: 10,
    },
  });
  console.log('✅ Created workspace:', workspace.name);

  // Create demo user
  // NOTE: Replace 'user_xxx' with your actual Clerk user ID after signing in
  const user = await prisma.user.create({
    data: {
      workspaceId: workspace.id,
      clerkId: 'user_demo_seed', // Replace with actual Clerk ID
      email: 'demo@signalcraft.dev',
      displayName: 'Demo User',
      role: WorkspaceRole.OWNER,
    },
  });
  console.log('✅ Created user:', user.email);

  // Create integrations
  await prisma.integration.createMany({
    data: [
      {
        workspaceId: workspace.id,
        type: IntegrationType.SENTRY,
        status: IntegrationStatus.ACTIVE,
        configJson: { project: 'demo-project', dsn: 'https://xxx@sentry.io/123' },
      },
      {
        workspaceId: workspace.id,
        type: IntegrationType.SLACK,
        status: IntegrationStatus.ACTIVE,
        configJson: {
          channel: '#alerts-demo',
          webhookUrl: 'https://hooks.slack.com/xxx',
          botToken: 'xoxb-xxx'
        },
      },
    ],
  });
  console.log('✅ Created integrations');

  // Create sample alert groups with various statuses and severities
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const alertGroups = await Promise.all([
    // Critical - Open
    prisma.alertGroup.create({
      data: {
        workspaceId: workspace.id,
        groupKey: 'db-connection-pool-exhausted',
        title: 'Database Connection Pool Exhausted',
        severity: AlertSeverity.CRITICAL,
        environment: 'production',
        project: 'api-gateway',
        status: AlertStatus.OPEN,
        firstSeenAt: hourAgo,
        lastSeenAt: now,
        count: 45,
        userCount: 1250,
        velocityPerHour: 45,
      },
    }),
    // High - Acknowledged
    prisma.alertGroup.create({
      data: {
        workspaceId: workspace.id,
        groupKey: 'payment-service-timeout',
        title: 'Payment Service Timeout - Stripe API',
        severity: AlertSeverity.HIGH,
        environment: 'production',
        project: 'checkout',
        status: AlertStatus.ACK,
        firstSeenAt: dayAgo,
        lastSeenAt: hourAgo,
        count: 23,
        userCount: 340,
        velocityPerHour: 12,
        assigneeUserId: user.id,
      },
    }),
    // Medium - Open
    prisma.alertGroup.create({
      data: {
        workspaceId: workspace.id,
        groupKey: 'redis-cache-miss-rate',
        title: 'High Redis Cache Miss Rate (>30%)',
        severity: AlertSeverity.MEDIUM,
        environment: 'production',
        project: 'user-service',
        status: AlertStatus.OPEN,
        firstSeenAt: dayAgo,
        lastSeenAt: now,
        count: 156,
        velocityPerHour: 6.5,
      },
    }),
    // Resolved with resolution notes (for AI testing)
    prisma.alertGroup.create({
      data: {
        workspaceId: workspace.id,
        groupKey: 'memory-leak-worker',
        title: 'Memory Leak in Background Worker',
        severity: AlertSeverity.HIGH,
        environment: 'production',
        project: 'worker-pool',
        status: AlertStatus.RESOLVED,
        firstSeenAt: weekAgo,
        lastSeenAt: dayAgo,
        count: 12,
        resolvedAt: dayAgo,
        resolutionNotes: 'Fixed by restarting the worker pods and applying memory limit. Root cause: unbounded cache in the job processor. Patched in PR #1234.',
        lastResolvedBy: user.id,
        avgResolutionMins: 45,
      },
    }),
    // Another resolved for AI pattern matching
    prisma.alertGroup.create({
      data: {
        workspaceId: workspace.id,
        groupKey: 'memory-leak-worker-v2',
        title: 'Memory Leak in Background Worker Process',
        severity: AlertSeverity.HIGH,
        environment: 'staging',
        project: 'worker-pool',
        status: AlertStatus.RESOLVED,
        firstSeenAt: weekAgo,
        lastSeenAt: weekAgo,
        count: 5,
        resolvedAt: weekAgo,
        resolutionNotes: 'kubectl rollout restart deployment/worker-pool -n production. Added memory limits to prevent recurrence.',
        lastResolvedBy: 'slack:U123456',
        avgResolutionMins: 30,
      },
    }),
    // Low severity - staging
    prisma.alertGroup.create({
      data: {
        workspaceId: workspace.id,
        groupKey: 'deprecated-api-usage',
        title: 'Deprecated API v1 Still Being Used',
        severity: AlertSeverity.LOW,
        environment: 'staging',
        project: 'api-gateway',
        status: AlertStatus.OPEN,
        firstSeenAt: weekAgo,
        lastSeenAt: dayAgo,
        count: 89,
        velocityPerHour: 0.5,
      },
    }),
    // Snoozed
    prisma.alertGroup.create({
      data: {
        workspaceId: workspace.id,
        groupKey: 'rate-limit-exceeded',
        title: 'Rate Limit Exceeded for External API',
        severity: AlertSeverity.MEDIUM,
        environment: 'production',
        project: 'integrations',
        status: AlertStatus.SNOOZED,
        firstSeenAt: dayAgo,
        lastSeenAt: hourAgo,
        count: 34,
        snoozeUntil: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
      },
    }),
    // Info level
    prisma.alertGroup.create({
      data: {
        workspaceId: workspace.id,
        groupKey: 'deployment-started',
        title: 'Deployment Started: api-gateway v2.3.1',
        severity: AlertSeverity.INFO,
        environment: 'production',
        project: 'api-gateway',
        status: AlertStatus.RESOLVED,
        firstSeenAt: hourAgo,
        lastSeenAt: hourAgo,
        count: 1,
        resolvedAt: hourAgo,
      },
    }),
  ]);
  console.log(`✅ Created ${alertGroups.length} alert groups`);

  // Create sample alert events for the first alert group
  const dbAlert = alertGroups[0];
  const events = [];
  for (let i = 0; i < 10; i++) {
    events.push({
      workspaceId: workspace.id,
      alertGroupId: dbAlert.id,
      source: 'sentry',
      sourceEventId: `sentry-event-${i}-${Date.now()}`,
      project: 'api-gateway',
      environment: 'production',
      severity: AlertSeverity.CRITICAL,
      fingerprint: 'db-connection-pool-exhausted',
      tagsJson: { team: 'platform', service: 'postgres', host: `api-${i % 3 + 1}` },
      title: 'Database Connection Pool Exhausted',
      message: `Connection pool exhausted after 100 connections. Queue depth: ${50 + i * 10}. Waiting requests: ${20 + i * 5}.`,
      occurredAt: new Date(now.getTime() - i * 5 * 60 * 1000), // Every 5 minutes
      payloadJson: {
        pool_size: 100,
        active_connections: 100,
        waiting_requests: 20 + i * 5,
        transaction_timeout_ms: 30000
      },
    });
  }
  await prisma.alertEvent.createMany({ data: events });
  console.log(`✅ Created ${events.length} alert events`);

  // Create routing rules
  await prisma.routingRule.createMany({
    data: [
      {
        workspaceId: workspace.id,
        name: 'Critical Production Alerts',
        description: 'Route all critical production alerts to #incidents with @channel mention',
        conditionsJson: {
          all: [
            { field: 'severity', operator: 'equals', value: 'CRITICAL' },
            { field: 'environment', operator: 'equals', value: 'production' },
          ],
        },
        actionsJson: {
          slackChannelId: 'C123INCIDENTS',
          mentionChannel: true,
          escalateAfterMinutes: 15,
        },
        priority: 0,
        enabled: true,
      },
      {
        workspaceId: workspace.id,
        name: 'High Severity to On-Call',
        description: 'Route high severity alerts to the on-call channel',
        conditionsJson: {
          all: [
            { field: 'severity', operator: 'in', value: ['HIGH', 'CRITICAL'] },
          ],
        },
        actionsJson: {
          slackChannelId: 'C123ONCALL',
          mentionHere: true,
          escalateAfterMinutes: 30,
        },
        priority: 10,
        enabled: true,
      },
      {
        workspaceId: workspace.id,
        name: 'Staging Alerts',
        description: 'Send staging alerts to dev channel without mentions',
        conditionsJson: {
          all: [
            { field: 'environment', operator: 'equals', value: 'staging' },
          ],
        },
        actionsJson: {
          slackChannelId: 'C123DEV',
        },
        priority: 50,
        enabled: true,
      },
    ],
  });
  console.log('✅ Created routing rules');

  // Create correlation rules (for related alerts)
  // NOTE: CorrelationRule table doesn't exist yet, commenting out
  // await prisma.correlationRule.createMany({
  //   data: [
  //     {
  //       workspaceId: workspace.id,
  //       sourceGroupKey: 'db-connection-pool-exhausted',
  //       targetGroupKey: 'payment-service-timeout',
  //       confidence: 0.85,
  //     },
  //     {
  //       workspaceId: workspace.id,
  //       sourceGroupKey: 'redis-cache-miss-rate',
  //       targetGroupKey: 'payment-service-timeout',
  //       confidence: 0.65,
  //     },
  //   ],
  // });
  // console.log('✅ Created correlation rules');

  console.log('\n🎉 Seeding complete!');
  console.log('\n⚠️  IMPORTANT: Update the clerkId in this script with your actual Clerk user ID after signing in.');
  console.log('   Your Clerk ID will look like: user_2abc123xyz456');
  console.log('   Run `npx prisma db seed` again after updating.\n');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
