import { Construct, Stack, StackProps, CfnParameter } from "@aws-cdk/core";

class CfnParameterStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new CfnParameter(this, `ParameterString`, {
      type: "String",
      default: "Hello World"
    });

    new CfnParameter(this, `ParameterNumber`, {
      type: "Number",
      default: 1337
    });
  }
}

export { CfnParameterStack };
