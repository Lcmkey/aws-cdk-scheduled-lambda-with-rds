#!/usr/bin/env node
require("dotenv").config();

import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { LambdaStack, PipelineStack } from "../lib";

// Define aws account / region / rds id && arn
const {
  CDK_ACCOUNT: accountId = "[AWS ACCOUNT ID]",
  CDK_REGION: region = "ap-southeast-1",
  CDK_RDS_INSTANCE_ID: rdsInstanceId = "[RDS DB INSTANCE ID]",
  CDK_RDS_INSTANCE_ARN: rdsInstanceARN = "[RDS DB INSTANCE ARN]"
} = process.env;

// Define aws defulat env config
const env = {
  account: accountId,
  region: region
};

const app = new cdk.App();

// Define Lambda Stack
const lambdaStack = new LambdaStack(app, "LambdaStack", {
  env,
  rdsInstanceId,
  rdsInstanceARN
});

// Define Pipeline Stack
new PipelineStack(app, "PipelineStack", {
  env,
  startUpLambdaCode: lambdaStack.startUpLambdaCode,
  shutDownLambdaCode: lambdaStack.shutDownLambdaCode,
  rdsInstanceId,
  rdsInstanceARN
});

app.synth();
