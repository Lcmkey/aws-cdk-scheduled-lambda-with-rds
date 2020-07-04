import { Construct, Stack, StackProps, CfnParameter } from "@aws-cdk/core";
import { StringParameter, StringListParameter } from "@aws-cdk/aws-ssm";

interface SsmStackProps extends StackProps {
  readonly prefix: string;
  readonly stage: string;
  readonly gitOwner: string;
  readonly gitRepo: string;
}

class SsmStack extends Stack {
  constructor(scope: Construct, id: string, props: SsmStackProps) {
    super(scope, id, props);

    const { gitOwner, gitRepo, prefix, stage } = props;

    this.buildStringParameter(
      "GitOwner",
      `/${prefix}-${stage}-automatic-aws-db-shutdown-cdk/github/owner`,
      gitOwner
    );

    this.buildStringParameter(
      "GitRepo",
      `/${prefix}-${stage}-automatic-aws-db-shutdown-cdk/github/repo`,
      gitRepo
    );

    this.buildStringListParameter(
      "GitOwnerAndRepo",
      `/${prefix}-${stage}-automatic-aws-db-shutdown-cdk/github`,
      [gitOwner, gitRepo]
    );
  }

  private buildStringParameter(id: string, name: string, value: string) {
    new StringParameter(this, `${id}-StringParameter`, {
      parameterName: name,
      stringValue: value,
      description: "Some description",
      allowedPattern: ".*"
    });
  }

  private buildStringListParameter(
    id: string,
    name: string,
    values: Array<string>
  ) {
    new StringListParameter(this, `${id}-StringListParameter`, {
      parameterName: name,
      stringListValue: values,
      description: "Some description",
      allowedPattern: ".*"
    });
  }
}

export { SsmStack };
