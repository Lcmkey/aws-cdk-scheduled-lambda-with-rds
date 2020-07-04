#!/usr/bin/env node
require("dotenv").config();

import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import {
  CfnParameterStack,
  SsmStack,
  SecretsManagerStack,
  VpcStack,
  RdsStack,
  LambdaStack,
  PipelineStack
} from "../lib";

// Define aws account / region / rds id && arn
const {
  PREFIX: prefix = "[STACK PREFIX NAME]",
  STAGE: stage = "[DEPLOYMENT STAGE]",
  CDK_ACCOUNT: accountId = "[AWS ACCOUNT ID]",
  CDK_REGION: region = "ap-southeast-1",
  CDK_RDS_INSTANCE_ID: rdsInstanceId = "[RDS DB INSTANCE ID]",
  CDK_RDS_INSTANCE_ARN: rdsInstanceARN = "[RDS DB INSTANCE ARN]",
  GIT_OWNER: gitOwner = "[GIT OWMER]",
  GIT_REPO: gitRepo = "[GIT REPO]",
  GIT_TOKEN: gitToken = "[GIT TOKEN]"
} = process.env;

// Define aws defulat env config
const env = {
  account: accountId,
  region: region
};

const app = new cdk.App();

// Create Cfn Parameter, you can use it in other stack after created
new CfnParameterStack(app, `${prefix}-${stage}-CfnParameterStack`);

// Create SSM
new SsmStack(app, `${prefix}-${stage}-SsmStack`, {
  env,
  prefix,
  stage,
  gitOwner,
  gitRepo
});

// Define Secrets
const secretsManagerStack = new SecretsManagerStack(
  app,
  `${prefix}-${stage}-SecretsManagerStack`,
  {
    env,
    prefix,
    stage,
    gitToken
  }
);

// Define Vpc && Security Group
const vpcStack = new VpcStack(app, `${prefix}-${stage}-VpcStack`, {
  env,
  prefix,
  stage
});

// Create RDS
new RdsStack(app, `${prefix}-${stage}-RdsStack`, {
  env,
  prefix,
  stage,
  vpc: vpcStack.vpc,
  rdsSg: vpcStack.rdsSg,
  rdbCredentialsSecret: secretsManagerStack.rdbCredentialsSecret
});

// Define Lambda Stack
const lambdaStack = new LambdaStack(app, `${prefix}-${stage}-LambdaStack`, {
  env,
  prefix,
  stage,
  rdsInstanceId,
  rdsInstanceARN
});

// Define Pipeline Stack
new PipelineStack(app, `${prefix}-${stage}-PipelineStack`, {
  env,
  prefix,
  stage,
  startUpLambdaCode: lambdaStack.startUpLambdaCode,
  shutDownLambdaCode: lambdaStack.shutDownLambdaCode,
  rdsInstanceId,
  rdsInstanceARN
});

app.synth();
