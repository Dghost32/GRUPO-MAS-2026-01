import { Resource } from "sst";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import type { ClickEvent } from "@url-shortener/core";

const sns = new SNSClient();

export const EventPublisher = {
  publishClick(event: ClickEvent): void {
    sns
      .send(
        new PublishCommand({
          TopicArn: Resource.ClickTopic.arn,
          Message: JSON.stringify(event),
        })
      )
      .catch((err) => console.error("SNS publish failed:", err));
  },
};
