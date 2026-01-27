import { Injectable } from '@nestjs/common';
import { AlertSeverity } from '@signalcraft/database';
import { WebhookStrategy, NormalizedAlert } from '../webhook.strategy';

@Injectable()
export class AwsCloudWatchStrategy implements WebhookStrategy {
  async parse(payload: any): Promise<NormalizedAlert | null> {
    // AWS CloudWatch sends JSON inside the "Message" field of an SNS notification
    let message = payload;
    if (payload.Type === 'Notification' && payload.Message) {
      try {
        message = JSON.parse(payload.Message);
      } catch (e) {
        // If message isn't JSON, treat the whole payload as the message
      }
    }

    // Standard CloudWatch Alarm Schema
    const alarmName = message.AlarmName || payload.AlarmName || 'Unknown AWS Alarm';
    const newState = message.NewStateValue || payload.NewStateValue;
    const reason = message.NewStateReason || payload.NewStateReason || '';
    const region = message.Region || payload.Region || 'us-east-1';

    // Severity Mapping
    let severity: AlertSeverity = AlertSeverity.HIGH;
    if (newState === 'ALARM') severity = AlertSeverity.CRITICAL;
    else if (newState === 'OK') severity = AlertSeverity.INFO;

    return {
      title: `AWS Alarm: ${alarmName}`,
      message: reason,
      severity,
      sourceEventId: message.AlarmArn || payload.AlarmArn || `${Date.now()}`,
      description: message.AlarmDescription,
      tags: {
        region,
        account: message.AWSAccountId || payload.AWSAccountId,
        namespace: message.Namespace,
      },
      link: `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#alarmsV2:alarm/${alarmName}`,
    };
  }

  validate(payload: any): boolean {
    // For SNS, we should verify the signature.
    // For MVP, we'll rely on the unique integration token in the URL.
    return true;
  }
}
