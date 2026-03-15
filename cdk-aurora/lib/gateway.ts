import { Construct } from "constructs";
import {
  aws_apigateway as apigateway,
  aws_lambda as lambda,
} from "aws-cdk-lib";

export class ApiGateway extends Construct {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, dataApiLambda: lambda.Function) {
    super(scope, id);

    // apigatewayの構築
    this.api = new apigateway.RestApi(this, "Api", {
      restApiName: "aurora-data-api-service",
      deployOptions: {
        stageName: "dev",
      },
    });

    // GET /db → Lambda (DB疎通用)
    const db = this.api.root.addResource("db");
    db.addMethod("GET", new apigateway.LambdaIntegration(dataApiLambda));

    // GET /health → MOCK (API疎通用)
    const health = this.api.root.addResource("health");
    health.addMethod(
      "GET",
      new apigateway.MockIntegration({
        // モックデータ
        passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
        requestTemplates: { "application/json": '{"statusCode": 200}' },
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": JSON.stringify({ status: "ok" }),
            },
          },
        ],
      }),
      {
        methodResponses: [{ statusCode: "200" }],
      }
    );
  }
}
