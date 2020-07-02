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

# Setup

### **Database**

To test our code we will use the AWS CLI to setup a MySQL database on a db.t2.micro instance.

Create Rds Instance

    $ aws rds create-db-instance --db-instance-identifier testdb --db-instance-class db.t2.micro --engine mysql --allocated-storage 20 --master-username admin --master-user-password yourPw

Delete Rds Instance

    $ aws rds delete-db-instance --db-instance-identifier testdb --skip-final-snapshot

### **SSM**

Save Git Repository name to SSM

    $ aws ssm put-parameter --name /automatic-aws-db-shutdown-cdk/github/repo --description "Github Repository name for Pipeline Stack" --type String --value automatic-aws-db-shutdown-cdk

Save Github Owner to SSM

    $ aws ssm put-parameter --name /automatic-aws-db-shutdown-cdk/github/owner --description "Github Owner for Pipeline Stack" --type String --value HatchSoftware

### **Secrets Manager**

Store the github toekn to AWS Secrets Manager

    $ aws secretsmanager create-secret --name /automatic-aws-db-shutdown-cdk/github/token --secret-string '{"github-token":"<YOUR GITHUB TOKEN>"}'

Delete the Secrest from Secrets Manager

    $ aws secretsmanager delete-secret --secret-id your-secret --force-delete-without-recovery --region your-region
