import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { Topic } from "@aws-cdk/aws-sns";
import { StringParameter } from "@aws-cdk/aws-ssm";
import { EmailSubscription } from "@aws-cdk/aws-sns-subscriptions";

interface SnsStackProps extends StackProps {
  readonly prefix: string;
  readonly stage: string;
  readonly email: string;
}

class SnsStack extends Stack {
  constructor(scope: Construct, id: string, props: SnsStackProps) {
    super(scope, id, props);

    const { prefix, stage, email } = props;

    const topic = new Topic(this, "Topic", {
      topicName: `${prefix}-${stage}-SnsToipc`,
      displayName: `${prefix}-${stage}-Email subscription topic`
    });

    topic.addSubscription(new EmailSubscription(email));

    // Save Arn to SSM, you can use it in other stack after created
    new StringParameter(this, `${prefix}-${stage}-SnsEmailArn`, {
      parameterName: `${prefix}-${stage}-sns-email-arn`,
      stringValue: topic.topicArn
    });
  }
}

export { SnsStack };
