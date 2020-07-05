import { Construct, Duration, Stack, StackProps } from "@aws-cdk/core";
import {
  CfnParametersCode,
  Code,
  Function,
  Runtime,
  Alias,
  LayerVersion
} from "@aws-cdk/aws-lambda";
import { LambdaFunction } from "@aws-cdk/aws-events-targets";
import { PolicyStatement, Effect } from "@aws-cdk/aws-iam";
import { Rule, Schedule } from "@aws-cdk/aws-events";
import { StringParameter } from "@aws-cdk/aws-ssm";
import {
  LambdaDeploymentGroup,
  LambdaDeploymentConfig
} from "@aws-cdk/aws-codedeploy";

// Define interface
export interface LambdaStackProps extends StackProps {
  readonly prefix: string;
  readonly stage: string;
  readonly rdsInstanceId: string;
  readonly rdsInstanceARN: string;
}

export class LambdaStack extends Stack {
  public readonly lambdaLayerCode: CfnParametersCode;
  public readonly startUpLambdaCode: CfnParametersCode;
  public readonly shutDownLambdaCode: CfnParametersCode;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const { prefix, stage, rdsInstanceId, rdsInstanceARN } = props;
    const snsTopicArn = StringParameter.fromStringParameterAttributes(
      this,
      "SnsTopicArn",
      {
        parameterName: `${prefix}-${stage}-sns-email-arn`
        // 'version' can be specified but is optional.
      }
    ).stringValue;

    // Define an AWS Lambda resource
    this.lambdaLayerCode = Code.cfnParameters();
    this.shutDownLambdaCode = Code.fromCfnParameters();
    this.startUpLambdaCode = Code.fromCfnParameters();

    // Define Lambda layer
    const lambdaLayer = this.buildLayerVersion(
      "LambdaLayer",
      `${prefix}-${stage}-Lambda-Layer`,
      this.lambdaLayerCode
    );

    // Create Showdown && Startup lambda func

    const shudownLambdaFunc = this.buildEventTriggeredLambdaFunction(
      "DBShutDown",
      `${prefix}-${stage}-DB-Shutdown-Func`,
      lambdaLayer,
      rdsInstanceId,
      rdsInstanceARN,
      ["rds:StopDBInstance", "sns:Publish"],
      "0 17 ? * MON-FRI *",
      this.shutDownLambdaCode,
      snsTopicArn
    );

    const startupLambdaFunc = this.buildEventTriggeredLambdaFunction(
      "DBStartUp",
      `${prefix}-${stage}-DB-Startup-Func`,
      lambdaLayer,
      rdsInstanceId,
      rdsInstanceARN,
      ["rds:StartDBInstance", "sns:Publish"],
      "0 5 ? * MON-FRI *",
      this.startUpLambdaCode,
      snsTopicArn
    );

    // Define Alias
    const shutdownLambdaFuncAlias = this.buildAlias(
      "shutdown",
      stage,
      shudownLambdaFunc
    );
    const startupLambdaFuncAlias = this.buildAlias(
      "startup",
      stage,
      startupLambdaFunc
    );

    // Create Deployment Group
    this.buildLambdaDeploymentGroup("shudown", shutdownLambdaFuncAlias);
    this.buildLambdaDeploymentGroup("startup", startupLambdaFuncAlias);
  }

  private buildLayerVersion(
    id: string,
    name: string,
    code: CfnParametersCode
  ): LayerVersion {
    return new LayerVersion(this, id, {
      layerVersionName: name,
      // code: lambda.Code.fromAsset(path.resolve(__dirname, "..", "lambda", "layer")),
      code,
      compatibleRuntimes: [Runtime.NODEJS_10_X, Runtime.NODEJS_12_X]
    });
  }

  // Create Lambda Func, Policy && cloudwatch rules
  private buildEventTriggeredLambdaFunction(
    id: string,
    name: string,
    layer: LayerVersion,
    rdsInstanceId: string,
    rdsInstanceARN: string,
    instanceActions: Array<string>,
    scheduleExpression: string,
    lambdaCode: CfnParametersCode,
    snsTopicArn: string
  ): Function {
    const lambdaFn = this.buildLambdaFunction(
      `${id}Function`,
      name,
      "app",
      lambdaCode,
      layer,
      rdsInstanceId,
      snsTopicArn
    );

    const instanceActionPolicy = this.buildPolicy(
      instanceActions,
      rdsInstanceARN
    );
    lambdaFn.addToRolePolicy(instanceActionPolicy);

    const eventRule = this.buildEventRule(`${id}-Rule`, scheduleExpression);
    eventRule.addTarget(new LambdaFunction(lambdaFn));

    return lambdaFn;
  }

  // Create new Lambda Func
  private buildLambdaFunction(
    id: string,
    name: string,
    filename: string,
    code: CfnParametersCode,
    layer: LayerVersion,
    rdsInstanceId: string,
    snsTopicArn: string
  ): Function {
    return new Function(this, id, {
      functionName: name,
      code: code,
      handler: filename + ".lambdaHandler",
      memorySize: 128,
      timeout: Duration.seconds(300),
      runtime: Runtime.NODEJS_10_X,
      layers: [layer],
      environment: {
        INSTANCE_IDENTIFIER: rdsInstanceId,
        SNS_TOPIC_ARN: snsTopicArn
      }
    });
  }

  // Create new Policy
  private buildPolicy(
    actionsToAllow: Array<string>,
    rdsInstanceARN: string
  ): PolicyStatement {
    return new PolicyStatement({
      effect: Effect.ALLOW,
      actions: actionsToAllow,
      // resources: [rdsInstanceARN]
      resources: ["*"]
    });
  }

  // Create new Event Rules
  private buildEventRule(id: string, scheduleExpression: string): Rule {
    return new Rule(this, id, {
      schedule: Schedule.expression("cron(" + scheduleExpression + ")")
    });
  }

  // Create Lambda Alias
  private buildAlias(id: string, stage: string, lambdaFunc: Function): Alias {
    return new Alias(this, `${id}-LambdaAlias`, {
      aliasName: stage,
      version: lambdaFunc.latestVersion
    });
  }

  // Create Lambda Deployment Group
  private buildLambdaDeploymentGroup(id: string, alias: Alias) {
    new LambdaDeploymentGroup(this, `${id}-DeploymentGroup`, {
      alias,
      deploymentConfig: LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE
    });
  }
}
