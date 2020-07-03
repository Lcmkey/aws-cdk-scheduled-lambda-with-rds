import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { Secret, CfnSecret } from "@aws-cdk/aws-secretsmanager";

interface SecretsManagerStackProps extends StackProps {
  readonly gitToken: string;
}

class SecretsManagerStack extends Stack {
  constructor(scope: Construct, id: string, props: SecretsManagerStackProps) {
    super(scope, id, props);

    this.buildSecretManager(
      "Gittoken",
      "/automatic-aws-db-shutdown-cdk/github/token/test",
      JSON.stringify({
        "github-token": props.gitToken
      })
    );
  }

  private buildSecretManager(id: string, name: string, value: string) {
    new Secret(this, `${id}-SecretsManager`, {
      secretName: name,
      generateSecretString: {
        secretStringTemplate: value,
        generateStringKey: "key",
        excludePunctuation: true,
        includeSpace: false
      }
    });
  }
}

export { SecretsManagerStack };
