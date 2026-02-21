#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { MyStack } from "../lib/my-stack";
import * as dotenv from "dotenv";

dotenv.config();
const app = new cdk.App();

new MyStack(app, "MyStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
