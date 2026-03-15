import {
  ExecuteStatementCommand,
  RDSDataClient,
} from "@aws-sdk/client-rds-data";

// クライアントは再利用時の初期化コストを省く為にハンドラー外で初期化
const client = new RDSDataClient({});

// SELECT 1 を Data API で実行して結果を返却
export const handler = async (_event: unknown) => {
  try {
    const result = await client.send(
      new ExecuteStatementCommand({
        resourceArn: process.env.CLUSTER_ARN!, // クラスターARN
        secretArn: process.env.SECRET_ARN!, // シークレットARN
        database: process.env.DATABASE_NAME!, // DB名
        sql: "SELECT 1",
      })
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: result.records }),
    };
  } catch (error) {
    console.error("Data API error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
