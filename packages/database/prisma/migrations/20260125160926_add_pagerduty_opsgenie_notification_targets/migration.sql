-- Add notification targets for PagerDuty and Opsgenie
ALTER TYPE "NotificationTarget" ADD VALUE IF NOT EXISTS 'PAGERDUTY';
ALTER TYPE "NotificationTarget" ADD VALUE IF NOT EXISTS 'OPSGENIE';
