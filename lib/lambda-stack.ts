import { Construct, Duration, Stack, StackProps } from "@aws-cdk/core";
import {
  CfnParametersCode,
  Code,
  Function,
  Runtime,
  Alias
} from "@aws-cdk/aws-lambda";
import { LambdaFunction } from "@aws-cdk/aws-events-targets";
import { PolicyStatement, Effect } from "@aws-cdk/aws-iam";
import { Rule, Schedule } from "@aws-cdk/aws-events";
import {
  LambdaDeploymentGroup,
  LambdaDeploymentConfig
} from "@aws-cdk/aws-codedeploy";

// Define interface
export interface LambdaStackProps extends StackProps {
  readonly rdsInstanceId: string;
  readonly rdsInstanceARN: string;
}

export class LambdaStack extends Stack {
  public readonly startUpLambdaCode: CfnParametersCode;
  public readonly shutDownLambdaCode: CfnParametersCode;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    this.shutDownLambdaCode = Code.fromCfnParameters();
    this.startUpLambdaCode = Code.fromCfnParameters();

    const shudownLambdaFunc = this.buildEventTriggeredLambdaFunction(
      "DBShutDown",
      props.rdsInstanceId,
      props.rdsInstanceARN,
      "rds:StopDBInstance",
      "0 17 ? * MON-FRI *",
      this.shutDownLambdaCode
    );

    const startupLambdaFunc = this.buildEventTriggeredLambdaFunction(
      "DBStartUp",
      props.rdsInstanceId,
      props.rdsInstanceARN,
      "rds:StartDBInstance",
      "0 5 ? * MON-FRI *",
      this.startUpLambdaCode
    );

    const shutdownLambdaFuncAlias = this.buildAlias(
      "shutdown",
      shudownLambdaFunc
    );
    const startupLambdaFuncAlias = this.buildAlias(
      "startup",
      startupLambdaFunc
    );

    this.buildLambdaDeploymentGroup(shutdownLambdaFuncAlias);
    this.buildLambdaDeploymentGroup(startupLambdaFuncAlias);
  }

  private buildAlias(id: string, lambdaFunc: Function): Alias {
    return new Alias(this, `${id}LambdaAlias`, {
      aliasName: "Prod",
      version: lambdaFunc.latestVersion
    });
  }

  private buildLambdaDeploymentGroup(alias: Alias) {
    new LambdaDeploymentGroup(this, "DeploymentGroup", {
      alias,
      deploymentConfig: LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE
    });
  }

  private buildEventTriggeredLambdaFunction(
    name: string,
    rdsInstanceId: string,
    rdsInstanceARN: string,
    instanceAction: string,
    scheduleExpression: string,
    lambdaCode: CfnParametersCode
  ): Function {
    const lambdaFn = this.buildLambdaFunction(
      `${name}Function`,
      "app",
      lambdaCode,
      rdsInstanceId
    );

    const instanceActionPolicy = this.buildPolicy(
      instanceAction,
      rdsInstanceARN
    );
    lambdaFn.addToRolePolicy(instanceActionPolicy);

    const eventRule = this.buildEventRule(`${name}Rule`, scheduleExpression);
    eventRule.addTarget(new LambdaFunction(lambdaFn));

    return lambdaFn;
  }

  // Create new Lambda Func
  private buildLambdaFunction(
    id: string,
    filename: string,
    code: CfnParametersCode,
    rdsInstanceId: string
  ): Function {
    return new Function(this, id, {
      code: code,
      handler: filename + ".lambdaHandler",
      memorySize: 128,
      timeout: Duration.seconds(300),
      runtime: Runtime.NODEJS_10_X,
      environment: {
        INSTANCE_IDENTIFIER: rdsInstanceId
      }
    });
  }

  // Create new Policy
  private buildPolicy(
    actionToAllow: string,
    rdsInstanceARN: string
  ): PolicyStatement {
    return new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [actionToAllow],
      resources: [rdsInstanceARN]
    });
  }

  // Create new Event Rules
  private buildEventRule(id: string, scheduleExpression: string): Rule {
    return new Rule(this, id, {
      schedule: Schedule.expression("cron(" + scheduleExpression + ")")
    });
  }
}
