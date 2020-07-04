import { Construct, Stack, StackProps, Duration } from "@aws-cdk/core";
import { StringParameter } from "@aws-cdk/aws-ssm";
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  StorageType
} from "@aws-cdk/aws-rds";
import { Secret } from "@aws-cdk/aws-secretsmanager";
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  SubnetType,
  Vpc,
  SecurityGroup
} from "@aws-cdk/aws-ec2";

interface RdsStackProps extends StackProps {
  readonly prefix: string;
  readonly stage: string;
  readonly vpc: Vpc;
  readonly rdsSg: SecurityGroup;
  readonly rdbCredentialsSecret: Secret;
}

class RdsStack extends Stack {
  readonly mySQLRDSInstance: DatabaseInstance;

  constructor(scope: Construct, id: string, props: RdsStackProps) {
    super(scope, id, props);

    const { prefix, stage, vpc, rdsSg, rdbCredentialsSecret } = props;

    // Save Arn to SSM, you can use it in other stack after created
    new StringParameter(this, "RDBCredentialsArn", {
      parameterName: `${prefix}-${stage}-rdb-credentials-arn`,
      stringValue: rdbCredentialsSecret.secretArn
    });

    // Create RDB Instance
    const mySQLRDSInstance = new DatabaseInstance(this, "mysql-rds-instance", {
      instanceIdentifier: `${prefix}-${stage}-mysql-test`,
      engine: DatabaseInstanceEngine.MYSQL,
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      vpc: vpc,
      securityGroups: [rdsSg],
      vpcPlacement: { subnetType: SubnetType.PUBLIC },
      storageEncrypted: false,
      multiAz: false,
      autoMinorVersionUpgrade: false,
      allocatedStorage: 25,
      storageType: StorageType.GP2,
      backupRetention: Duration.days(3),
      deletionProtection: false,
      masterUsername: rdbCredentialsSecret
        .secretValueFromJson("username")
        .toString(),
      databaseName: `reporting`,
      masterUserPassword: rdbCredentialsSecret.secretValueFromJson("password"),
      port: 3306
    });
  }
}

export { RdsStack };
