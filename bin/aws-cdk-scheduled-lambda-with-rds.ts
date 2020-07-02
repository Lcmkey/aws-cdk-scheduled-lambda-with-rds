#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsCdkScheduledLambdaWithRdsStack } from '../lib/aws-cdk-scheduled-lambda-with-rds-stack';

const app = new cdk.App();
new AwsCdkScheduledLambdaWithRdsStack(app, 'AwsCdkScheduledLambdaWithRdsStack');
