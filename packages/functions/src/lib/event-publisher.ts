import { Resource } from "sst";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import type { ClickEvent } from "@url-shortener/core";

const sns = new SNSClient();

export const EventPublisher = {
  async publishClick(event: ClickEvent): Promise<void> {
    await sns.send(
      new PublishCommand({
        TopicArn: Resource.ClickTopic.arn,
        Message: JSON.stringify(event),
      })
    );
  },
};
