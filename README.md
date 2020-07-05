# Welcome to your CDK TypeScript project!

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

# Reference
1. [maarten-thoelen][maarten-thoelen]
2. [CDK Documentation][cdk-doc]
3. 

# Using the AWS CDK to build scheduled Lambda Functions

### Steps (`CDK - Deployments`)

1. Create `.env` file

    ```properties
    # Project Info
    PREFIX=ScheduleLambda
    STAGE=Dev

    # CDK
    CDK_ACCOUNT=[YOUR_AWS_ACCOUNT_ID]
    CDK_REGION=ap-southeast-1
    CDK_RDS_INSTANCE_ID=[YOUR_RDS_DB_INSTANCE_ID]
    CDK_RDS_INSTANCE_ARN=[YOUR_RDS_DB_INSTANCE_ARN]
    CDK_SNS_EMAIL=[YOUR_SNS_EMAIL]

    # GIT
    GIT_OWNER=[GITHUB_OWNER]
    GIT_REPO=[GITHUB_REPO]
    GIT_TOKEN=[GITHUB_TOKEN]
    ```

2. Deploy SSM

    Create ssm for orther Stacks use

        $ cdk deploy ScheduleLambda-Dev-SsmStack


3. Deploy Secret Manager

    Save the Git Token && RDB username, password to Secrets Manager

        $ cdk deploy ScheduleLambda-Dev-SecretsManagerStack

4. Deploy RDS

    Create RBD in rds

        $ cdk deploy ScheduleLambda-Dev-RdsStack

5. Deploy SNS

    Create SNS && subscription for email notification

        $ cdk deploy ScheduleLambda-Dev-SnsStack

6. Deploy Vpc

    Create Vpc, subnet && securety group

        $ cdk deploy ScheduleLambda-Dev-VpcStack

7. Deploy pipeline

    Create pipeline for deployment

        $ cdk deploy ScheduleLambda-Dev-PipelineStack

---

# Clean Up

Please go to AWS console, entry [Cloudformation][aws-cloudformation] service, delete The previous deployed Stacks.


# CLI (`Optional - incomplete`)

### **RDS**

To test our code we will use the AWS CLI to setup a MySQL database on a db.t2.micro instance.

Create Rds Instance

    $ aws rds create-db-instance --db-instance-identifier testdb --db-instance-class db.t2.micro --engine mysql --allocated-storage 20 --master-username admin --master-user-password ${YOUR-RDS-PASSWORD}

### **SSM**

Save Git Repository name to SSM

    $ aws ssm put-parameter --name /automatic-aws-db-shutdown-cdk/github/repo --description "Github Repository name for Pipeline Stack" --type String --value ${YOUR-GITHUB-REPO-NAME}

Save Github Owner to SSM

    $ aws ssm put-parameter --name /automatic-aws-db-shutdown-cdk/github/owner --description "Github Owner for Pipeline Stack" --type String --value ${YOUR-GITHUB-USER-NAME}

### **Secrets Manager**

Store the github toekn to AWS Secrets Manager

    $ aws secretsmanager create-secret --name /automatic-aws-db-shutdown-cdk/github/token --secret-string '{"github-token":"${YOUR-GITHUB-TOKEN}"}'

# Clean up

Delete Rds Instance

    $ aws rds delete-db-instance --db-instance-identifier testdb --skip-final-snapshot

Delete the Secrest from Secrets Manager

    $ aws secretsmanager delete-secret --secret-id /automatic-aws-db-shutdown-cdk/github/token --force-delete-without-recovery --region ap-southeast-1

Delete SSM parameter

    $ aws ssm delete-parameter --name /automatic-aws-db-shutdown-cdk/github/repo

    $ aws ssm delete-parameter --name /automatic-aws-db-shutdown-cdk/github/owner

Delete the Lmabda deployment Stack

    $ aws cloudformation delete-stack --stack-name LambdaDeploymentStack

Delete The Pipeline Stack

    $ aws cloudformation delete-stack --stack-name PipelineStack

or

    $ cdk destroy PipelineStack

<!-- Reference -->

[maarten-thoelen]:https://medium.com/hatchsoftware/using-the-aws-cdk-to-build-scheduled-lambda-functions-13eb1674586e


[cdk-doc]:https://docs.aws.amazon.com/cdk/api/latest/docs/core-readme.html

[aws-cloudformation]:https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks?filteringText=&filteringStatus=active&viewNested=true&hideStacks=false