import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Vpc } from "./vpc";
import { Aurora } from "./aurora";

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const vpcConstruct = new Vpc(this, "Vpc");

    new Aurora(this, "Aurora", {
      vpc: vpcConstruct.vpc,
    });
  }
}
