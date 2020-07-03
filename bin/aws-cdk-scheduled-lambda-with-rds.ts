#!/usr/bin/env node
require("dotenv").config();

import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import {
  CfnParameterStack,
  SsmStack,
  LambdaStack,
  PipelineStack
} from "../lib";

const prefix = "ScheduleLambda";

// Define aws account / region / rds id && arn
const {
  CDK_ACCOUNT: accountId = "[AWS ACCOUNT ID]",
  CDK_REGION: region = "ap-southeast-1",
  CDK_RDS_INSTANCE_ID: rdsInstanceId = "[RDS DB INSTANCE ID]",
  CDK_RDS_INSTANCE_ARN: rdsInstanceARN = "[RDS DB INSTANCE ARN]",
  GIT_OWNER: gitOwner = "[GIT OWMER]",
  GIT_REPO: gitRepo = "[GIT REPO]"
} = process.env;

// Define aws defulat env config
const env = {
  account: accountId,
  region: region
};

const app = new cdk.App();

// Create Cfn Parameter
new CfnParameterStack(app, `${prefix}-CfnParameter`);

// Create SSM
new SsmStack(app, `${prefix}-SsmStack`, {
  env,
  gitOwner,
  gitRepo
});

// Define Lambda Stack
const lambdaStack = new LambdaStack(app, `${prefix}-LambdaStack`, {
  env,
  rdsInstanceId,
  rdsInstanceARN
});

// Define Pipeline Stack
new PipelineStack(app, `${prefix}-PipelineStack`, {
  env,
  startUpLambdaCode: lambdaStack.startUpLambdaCode,
  shutDownLambdaCode: lambdaStack.shutDownLambdaCode,
  rdsInstanceId,
  rdsInstanceARN
});

app.synth();
