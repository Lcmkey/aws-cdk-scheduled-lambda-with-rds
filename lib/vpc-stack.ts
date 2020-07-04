import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { Vpc, SubnetType, SecurityGroup, Port } from "@aws-cdk/aws-ec2";

interface VpcStackProps extends StackProps {
  readonly prefix: string;
  readonly stage: string;
}

interface subnetConfigurationSchema {
  name: string;
  subnetType: SubnetType;
}

class VpcStack extends Stack {
  readonly vpc: Vpc;
  readonly rdsSg: SecurityGroup;
  readonly lambdaSg: SecurityGroup;

  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id, props);

    const { prefix, stage } = props;

    const subnetConfiguration = [
      {
        cidrMask: 26,
        name: `${prefix}-${stage}-public-subnet-`,
        subnetType: SubnetType.PUBLIC
      }
      // { name: `${prefix}-${stage}-elb-public-`, subnetType: SubnetType.PUBLIC },
      // { name: `${prefix}-${stage}-ecs-private-`, subnetType: SubnetType.PRIVATE },
      // { name: `${prefix}-${stage}-aueora-isolated-`, subnetType: SubnetType.PUBLIC }
    ];

    // Define Vpc
    const vpc = this.createVpc(
      `${prefix}-${stage}`,
      "10.1.0.0/16",
      2,
      subnetConfiguration,
      0
    );

    // Define Security Group
    const rdsSg = this.createSecurityGroup(
      "RdsSg",
      `${prefix}-${stage}-rds-sg`,
      vpc,
      true
    );
    const lambdaSg = this.createSecurityGroup(
      "LambdaSg",
      `${prefix}-${stage}-lambda-sg`,
      vpc,
      true
    );

    rdsSg.addIngressRule(lambdaSg, Port.tcp(3306));

    this.vpc = vpc;
    this.rdsSg = rdsSg;
    this.lambdaSg = lambdaSg;
  }

  private createVpc(
    id: string,
    cidr: string,
    maxAzs: number,
    subnet: Array<subnetConfigurationSchema>,
    natGateways: number
  ): Vpc {
    return new Vpc(this, `${id}-VpcStack`, {
      cidr,
      maxAzs,
      subnetConfiguration: subnet,
      natGateways
    });
  }

  private createSecurityGroup(
    id: string,
    sgGroupName: string,
    vpc: Vpc,
    allowAllOutbound: boolean
  ): SecurityGroup {
    return new SecurityGroup(this, `${id}-SecurityGroup`, {
      vpc,
      allowAllOutbound,
      securityGroupName: sgGroupName
    });
  }
}

export { VpcStack };
