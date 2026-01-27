import { Test, TestingModule } from '@nestjs/testing';
import { AwsCloudWatchStrategy } from './aws-cloudwatch.strategy';
import { PrometheusStrategy } from './prometheus.strategy';
import { AlertSeverity } from '@signalcraft/database';

describe('Webhook Strategies', () => {
  let awsStrategy: AwsCloudWatchStrategy;
  let prometheusStrategy: PrometheusStrategy;

  beforeEach(async () => {
    awsStrategy = new AwsCloudWatchStrategy();
    prometheusStrategy = new PrometheusStrategy();
  });

  describe('AWS CloudWatch', () => {
    it('should parse SNS notification with JSON message', async () => {
      const payload = {
        Type: 'Notification',
        Message: JSON.stringify({
          AlarmName: 'CPU-High',
          NewStateValue: 'ALARM',
          NewStateReason: 'Threshold > 90%',
          Region: 'us-west-2',
        }),
        TopicArn: 'arn:aws:sns:...',
      };

      const result = await awsStrategy.parse(payload);
      expect(result).toBeDefined();
      expect(result?.title).toContain('CPU-High');
      expect(result?.severity).toBe(AlertSeverity.CRITICAL);
      expect(result?.tags?.region).toBe('us-west-2');
    });

    it('should parse OK state as INFO', async () => {
      const payload = {
        Type: 'Notification',
        Message: JSON.stringify({
          AlarmName: 'CPU-High',
          NewStateValue: 'OK',
        }),
      };
      const result = await awsStrategy.parse(payload);
      expect(result?.severity).toBe(AlertSeverity.INFO);
    });
  });

  describe('Prometheus', () => {
    it('should parse standard webhook payload', async () => {
      const payload = {
        status: 'firing',
        commonLabels: { alertname: 'HighErrorRate', severity: 'critical' },
        commonAnnotations: { summary: 'Error rate > 5%', description: 'Something is wrong' },
        alerts: [{ status: 'firing' }],
      };

      const result = await prometheusStrategy.parse(payload);
      expect(result).toBeDefined();
      expect(result?.title).toBe('HighErrorRate');
      expect(result?.severity).toBe(AlertSeverity.CRITICAL);
      expect(result?.message).toContain('Error rate > 5%');
    });

    it('should parse resolved payload', async () => {
      const payload = {
        status: 'resolved',
        commonLabels: { alertname: 'HighErrorRate', severity: 'critical' },
        alerts: [{ status: 'resolved' }],
      };
      const result = await prometheusStrategy.parse(payload);
      expect(result?.severity).toBe(AlertSeverity.INFO);
    });
  });
});
