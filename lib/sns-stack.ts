import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { Topic } from "@aws-cdk/aws-sns";
import { StringParameter } from "@aws-cdk/aws-ssm";
import { EmailSubscription } from "@aws-cdk/aws-sns-subscriptions";
import { Rule, RuleTargetInput, EventField } from "@aws-cdk/aws-events";
import { SnsTopic } from "@aws-cdk/aws-events-targets";

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

    // cloudwatch event rule
    const snsRule = new Rule(this, `${prefix}-${stage}-Rule`, {
      ruleName: `${prefix}-${stage}-pipeline-Rule`,
      eventPattern: {
        source: ["aws.codepipeline"],
        detailType: ["CodePipeline Pipeline Execution State Change"],
        detail: {
          state: ["FAILED", "SUCCEEDED"]
        }
      }
    });

    const pipeline_rule_target = new SnsTopic(topic, {
      // Input Transformer
      message: RuleTargetInput.fromObject({
        pipeline: EventField.fromPath("$.detail.pipeline"),
        state: EventField.fromPath("$.detail.state")
      })
    });

    snsRule.addTarget(pipeline_rule_target);

    // Save Arn to SSM, you can use it in other stack after created
    new StringParameter(this, `${prefix}-${stage}-SnsEmailArn`, {
      parameterName: `${prefix}-${stage}-sns-email-arn`,
      stringValue: topic.topicArn
    });
  }
}

export { SnsStack };
