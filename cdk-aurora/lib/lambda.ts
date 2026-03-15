import {
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodejs,
  aws_rds as rds,
  aws_secretsmanager as secretsmanager,
  Duration,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "path";

export type LambdaConstructProps = {
  vpc: ec2.IVpc;
  cluster: rds.DatabaseCluster;
  dbSecret: secretsmanager.Secret;
};

export class LambdaConstruct extends Construct {
  public readonly dataApiFunction: lambdaNodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    const { vpc, cluster, dbSecret } = props;

    // VPCエンドポイント
    // PRIVATE_ISOLATEDサブネットのため、VPCエンドポイント経由で実施
    vpc.addInterfaceEndpoint("SecretsManagerEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });
    vpc.addInterfaceEndpoint("RdsDataEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.RDS_DATA,
    });

    // Lambda用セキュリティグループ
    const lambdaSg = new ec2.SecurityGroup(this, "LambdaSecurityGroup", {
      vpc,
      description: "Security group for Lambda",
      allowAllOutbound: true,
    });

    // Lambda関数の定義
    this.dataApiFunction = new lambdaNodejs.NodejsFunction(
      this,
      "DataApiFunction",
      {
        functionName: "aurora-data-api-function",
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(__dirname, "../lambda/lambda-data-api.ts"),
        handler: "handler",
        vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        securityGroups: [lambdaSg],
        environment: {
          CLUSTER_ARN: cluster.clusterArn,
          SECRET_ARN: dbSecret.secretArn,
          DATABASE_NAME: "appdb",
        },
        timeout: Duration.seconds(30),
        bundling: {
          // AWS SDK v3はLambdaランタイムに含まれるためバンドル不要
          externalModules: ["@aws-sdk/*"],
        },
      }
    );

    // IAM 権限: Data APIの呼び出しを許可
    this.dataApiFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "rds-data:ExecuteStatement",
          "rds-data:BatchExecuteStatement",
          "rds-data:BeginTransaction",
          "rds-data:CommitTransaction",
          "rds-data:RollbackTransaction",
        ],
        resources: [cluster.clusterArn],
      })
    );

    // IAM 権限: Secrets Managerの読み取りを許可
    dbSecret.grantRead(this.dataApiFunction);
  }
}
