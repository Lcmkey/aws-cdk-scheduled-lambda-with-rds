import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { Topic } from "@aws-cdk/aws-sns";
import { EmailSubscription } from "@aws-cdk/aws-sns-subscriptions";

interface SnsStackProps extends StackProps {
  readonly prefix: string;
  readonly stage: string;
  readonly email: string;
}

class SnsStack extends Stack {
  public readonly topic: Topic;

  constructor(scope: Construct, id: string, props: SnsStackProps) {
    super(scope, id, props);

    const { prefix, stage, email } = props;

    const topic = new Topic(this, "Topic", {
      topicName: `${prefix}-${stage}-SnsToipc`,
      displayName: `${prefix}-${stage}-Email subscription topic`
    });

    topic.addSubscription(new EmailSubscription(email));

    this.topic = topic;
  }
}

export { SnsStack };
