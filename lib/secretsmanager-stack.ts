import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { Secret } from "@aws-cdk/aws-secretsmanager";

interface SecretsManagerStackProps extends StackProps {
  readonly prefix: string;
  readonly stage: string;
  readonly gitToken: string;
}

class SecretsManagerStack extends Stack {
  readonly rdbCredentialsSecret: Secret;

  constructor(scope: Construct, id: string, props: SecretsManagerStackProps) {
    super(scope, id, props);

    const { prefix, stage, gitToken } = props;

    // Github Access Token
    this.buildSecretManager(
      "GitHubToken",
      `/${prefix}-${stage}-automatic-aws-db-shutdown-cdk/github/token`,
      JSON.stringify({
        "github-token": gitToken
      }),
      "key"
    );

    // RDS Credentials
    const dbCredentialsSecret = this.buildSecretManager(
      "RDBCredentialsSecret",
      `${prefix}-${stage}-rdb-credentials`,
      JSON.stringify({
        username: "admin"
      }),
      "password"
    );

    this.rdbCredentialsSecret = dbCredentialsSecret;
  }

  private buildSecretManager(
    id: string,
    name: string,
    value: string,
    key: string
  ): Secret {
    return new Secret(this, `${id}-SecretsManager`, {
      secretName: name,
      generateSecretString: {
        secretStringTemplate: value,
        generateStringKey: key,
        excludePunctuation: true,
        includeSpace: false
      }
    });
  }
}

export { SecretsManagerStack };
