import { Resource } from 'sst';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import type { ClickEvent } from '@url-shortener/core';

const sns = new SNSClient();

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
const clickTopicArn: string = Resource.ClickTopic.arn;

export const EventPublisher = {
  async publishClick(event: ClickEvent): Promise<void> {
    await sns.send(
      new PublishCommand({
        TopicArn: clickTopicArn,
        Message: JSON.stringify(event),
      }),
    );
  },
};
