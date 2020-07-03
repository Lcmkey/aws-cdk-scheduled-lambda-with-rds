import { Construct, Stack, StackProps, CfnParameter } from "@aws-cdk/core";
import { StringParameter, StringListParameter } from "@aws-cdk/aws-ssm";

interface SsmStackProps extends StackProps {
  readonly gitOwner: string;
  readonly gitRepo: string;
}

class SsmStack extends Stack {
  constructor(scope: Construct, id: string, props: SsmStackProps) {
    super(scope, id, props);

    this.buildStringParameter(
      "GitOwner",
      "/automatic-aws-db-shutdown-cdk/github/owner",
      props.gitOwner
    );

    this.buildStringParameter(
      "GitRepo",
      "/automatic-aws-db-shutdown-cdk/github/repo",
      props.gitRepo
    );

    this.buildStringListParameter(
      "GitOwnerAndRepo",
      "/automatic-aws-db-shutdown-cdk/github",
      [props.gitOwner, props.gitRepo]
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
