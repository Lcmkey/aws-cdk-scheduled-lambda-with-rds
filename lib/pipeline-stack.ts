import { Construct, SecretValue, Stack, StackProps } from "@aws-cdk/core";
import { Artifact, Pipeline } from "@aws-cdk/aws-codepipeline";
import {
  CloudFormationCreateUpdateStackAction,
  CodeBuildAction,
  GitHubSourceAction
} from "@aws-cdk/aws-codepipeline-actions";
import { CfnParametersCode } from "@aws-cdk/aws-lambda";
import { StringParameter } from "@aws-cdk/aws-ssm";
import {
  BuildSpec,
  PipelineProject,
  LinuxBuildImage
} from "@aws-cdk/aws-codebuild";

interface EnvStackProps extends StackProps {
  readonly account: string;
  readonly region: string;
}

interface PipelineStackProps extends StackProps {
  readonly prefix: string;
  readonly stage: string;
  readonly lambdaLayerCode: CfnParametersCode;
  readonly startUpLambdaCode: CfnParametersCode;
  readonly shutDownLambdaCode: CfnParametersCode;
  readonly env: EnvStackProps;
  readonly rdsInstanceId: string;
  readonly rdsInstanceARN: string;
}

class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const { account, region } = props.env;
    const { prefix, stage, rdsInstanceId, rdsInstanceARN } = props;

    // Source action
    const oauthToken = SecretValue.secretsManager(
      `/${prefix}-${stage}-automatic-aws-db-shutdown-cdk/github/token`,
      { jsonField: "github-token" }
    );

    // valueFromLookup Always get value you created, event the Para has been deleted

    // const githubRepo = StringParameter.valueFromLookup(this, "/automatic-aws-db-shutdown-cdk/github/repo");
    // const githubOwner = StringParameter.valueFromLookup(this, "/automatic-aws-db-shutdown-cdk/github/owner");

    const githubOwner = StringParameter.fromStringParameterAttributes(
      this,
      "GitOwner",
      {
        parameterName: `/${prefix}-${stage}-automatic-aws-db-shutdown-cdk/github/owner`
        // 'version' can be specified but is optional.
      }
    ).stringValue;

    const githubRepo = StringParameter.fromStringParameterAttributes(
      this,
      "GitRepo",
      {
        parameterName: `/${prefix}-${stage}-automatic-aws-db-shutdown-cdk/github/repo`
        // 'version' can be specified but is optional.
      }
    ).stringValue;

    const sourceOutput = new Artifact("SourceOutput");
    const sourceAction = new GitHubSourceAction({
      actionName: "Source",
      owner: githubOwner,
      repo: githubRepo,
      branch: "master",
      oauthToken,
      output: sourceOutput
    });

    // Build actions
    const lambdaTemplateFileName = `${prefix}-${stage}-LambdaStack.template.json`;
    const cdkBuild = this.createCDKBuildProject(
      "CdkBuild",
      lambdaTemplateFileName,
      prefix,
      stage,
      account,
      region,
      rdsInstanceId,
      rdsInstanceARN
    );
    const cdkBuildOutput = new Artifact("CdkBuildOutput");
    const cdkBuildAction = new CodeBuildAction({
      actionName: "CDK_Build",
      project: cdkBuild,
      input: sourceOutput,
      outputs: [cdkBuildOutput]
    });

    const lambdaLayerBuild = this.createLambdaBuildProject(
      "LambdaLayerBuild",
      `${prefix}-${stage}-Lambda-Layer-Build`,
      [
        "cd ./src/layer/nodejs && npm install",
        "ls -alt",
        "cd ./../../..",
        "ls -alt"
      ],
      [],
      "src/layer",
      ["nodejs/package.json", "nodejs/package-lock.json", "nodejs/**/*"]
    );
    const lambdaLayerBuildOutput = new Artifact("LambdaLayerBuildOutput");
    const lambdaLayerBuildAction = new CodeBuildAction({
      actionName: "Lambda_Layer_Build",
      project: lambdaLayerBuild,
      input: sourceOutput,
      outputs: [lambdaLayerBuildOutput]
    });

    const shutDownLambdaBuild = this.createLambdaBuildProject(
      "ShutDownLambdaBuild",
      `${prefix}-${stage}-Shutdown-Lambda-Build`,
      [],
      [],
      "src/lambda/shutdown",
      ["*.js"]
    );
    const shutDownLambdaBuildOutput = new Artifact("ShutDownLambdaBuildOutput");
    const shutDownLambdaBuildAction = new CodeBuildAction({
      actionName: "Shut_Down_Lambda_Build",
      project: shutDownLambdaBuild,
      input: sourceOutput,
      outputs: [shutDownLambdaBuildOutput]
    });

    const startUpLambdaBuild = this.createLambdaBuildProject(
      "StartUpLambdaBuild",
      `${prefix}-${stage}-StartUp-Lambda-Build`,
      [],
      [],
      "src/lambda/startup",
      ["*.js"]
    );
    const startUpLambdaBuildOutput = new Artifact("StartUpLambdaBuildOutput");
    const startUpLambdaBuildAction = new CodeBuildAction({
      actionName: "Start_Up_Lambda_Build",
      project: startUpLambdaBuild,
      input: sourceOutput,
      outputs: [startUpLambdaBuildOutput]
    });

    // Deployment action
    const deployAction = new CloudFormationCreateUpdateStackAction({
      actionName: "Lambda_Deploy",
      templatePath: cdkBuildOutput.atPath(lambdaTemplateFileName),
      stackName: `${prefix}-${stage}-LambdaDeploymentStack`,
      adminPermissions: true,
      parameterOverrides: {
        ...props.lambdaLayerCode.assign(lambdaLayerBuildOutput.s3Location),
        ...props.startUpLambdaCode.assign(startUpLambdaBuildOutput.s3Location),
        ...props.shutDownLambdaCode.assign(shutDownLambdaBuildOutput.s3Location)
      },
      extraInputs: [
        lambdaLayerBuildOutput,
        startUpLambdaBuildOutput,
        shutDownLambdaBuildOutput
      ]
    });

    // Construct the pipeline
    const pipelineName = `${prefix}-${stage}-automatic-aws-db-shutdown-cdk-pipeline`;
    const pipeline = new Pipeline(this, pipelineName, {
      pipelineName: pipelineName,
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction]
        },
        {
          stageName: "Build",
          actions: [
            lambdaLayerBuildAction,
            startUpLambdaBuildAction,
            shutDownLambdaBuildAction,
            cdkBuildAction
          ]
        },
        {
          stageName: "Deploy",
          actions: [deployAction]
        }
      ]
    });

    // Make sure the deployment role can get the artifacts from the S3 bucket
    pipeline.artifactBucket.grantRead(deployAction.deploymentRole);
  }

  private createCDKBuildProject(
    id: string,
    templateFilename: string,
    prefix: string,
    stage: string,
    account: string,
    region: string,
    rdsInstanceId: string,
    rdsInstanceARN: string
  ): PipelineProject {
    return new PipelineProject(this, id, {
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            commands: ["npm install", "npm install -g cdk"]
          },
          build: {
            commands: [
              // "npm run build"
              "npm run cdk synth -- -o dist"
            ]
          }
        },
        artifacts: {
          "base-directory": "dist",
          files: [templateFilename]
        }
      }),
      environment: {
        buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_1_0
      },
      environmentVariables: {
        PREFIX: {
          value: prefix
        },
        STAGE: {
          value: stage
        },
        CDK_ACCOUNT: {
          value: account
        },
        CDK_REGION: {
          value: region
        },
        CDK_RDS_INSTANCE_ID: {
          value: rdsInstanceId
        },
        CDK_RDS_INSTANCE_ARN: {
          value: rdsInstanceARN
        }
      }
    });
  }

  private createLambdaBuildProject(
    id: string,
    name: string,
    installCmds: Array<string>,
    buildCmds: Array<string>,
    sourceCodeBaseDirectory: string,
    files: Array<string>
  ): PipelineProject {
    return new PipelineProject(this, id, {
      projectName: name,
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            commands: installCmds
          },
          build: {
            commands: buildCmds
          }
        },
        artifacts: {
          "base-directory": sourceCodeBaseDirectory,
          files
        }
      }),
      environment: {
        buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_1_0
      }
    });
  }
}

export { PipelineStack };
