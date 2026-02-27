import {
  aws_ec2 as ec2,
  aws_rds as rds,
  aws_secretsmanager as secretsmanager,
  RemovalPolicy,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export interface AuroraConstructProps {
  vpc: ec2.IVpc;
}

export class Aurora extends Construct {
  public readonly cluster: rds.DatabaseCluster;
  public readonly dbSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: AuroraConstructProps) {
    super(scope, id);
    const { vpc } = props;

    // セキュリティグループの設定
    const dbSecurityGroup = new ec2.SecurityGroup(this, "AuroraSecurityGroup", {
      vpc,
      description: "Security group for Aurora Serverless v2",
      allowAllOutbound: true, // アウトバウンドを許可
    });

    // DB認証情報（Secrets Manager）の作成
    this.dbSecret = new secretsmanager.Secret(this, "AuroraSecret", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: "dbadmin",
        }),
        generateStringKey: "password",
        excludePunctuation: true,
      },
    });

    // Aurora Serverless v2 クラスター
    this.cluster = new rds.DatabaseCluster(this, "AuroraServerlessCluster", {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        // Data API対応バージョンを選択
        version: rds.AuroraMysqlEngineVersion.VER_3_08_0,
      }),

      // Serverless v2 インスタンス
      writer: rds.ClusterInstance.serverlessV2("writer"),

      // ACUスケーリング範囲
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 2,
      credentials: rds.Credentials.fromSecret(this.dbSecret),

      // Private subnet
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },

      // セキュリティグループ
      securityGroups: [dbSecurityGroup],

      defaultDatabaseName: "appdb",

      // 開発用
      removalPolicy: RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    // Data API（HTTPエンドポイント）有効化
    this.cluster.addRotationSingleUser();
    const cfnCluster = this.cluster.node.defaultChild as rds.CfnDBCluster;
    cfnCluster.enableHttpEndpoint = true;
  }
}
