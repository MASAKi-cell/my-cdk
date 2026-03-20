import { aws_s3 as s3 } from "aws-cdk-lib";
// コンストラクタ内に追記
const inputBucket = new s3.Bucket(this, "OsenchiInputBucket", {
  bucketName: "osenchi-inputbucket",
});

const outputBucket = new s3.Bucket(this, "OsenchiOutputBucket", {
  bucketName: "osenchi-outputbucket",
});
