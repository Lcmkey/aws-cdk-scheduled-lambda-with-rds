import { Construct, Stack, StackProps, CfnParameter } from "@aws-cdk/core";

class CfnParameterStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new CfnParameter(this, "MyParameterString", {
      type: "String",
      default: "Hello World"
      // noEcho: true
    });

    new CfnParameter(this, "MyParameterNumber", {
      type: "Number",
      default: 1337
      // See the API reference for more configuration props
    });
  }
}

export { CfnParameterStack };
