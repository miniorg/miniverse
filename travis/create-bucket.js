const S3 = require('aws-sdk/clients/s3');

const s3 = new S3({
  endpoint: process.env.AWS_ENDPOINT,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  signatureVersion: process.env.AWS_SIGNATURE_VERSION,
  s3ForcePathStyle: Boolean(process.env.AWS_S3_FORCE_PATH_STYLE),
  maxRetries: 9
});

if (process.env.AWS_S3_BUCKET) {
  s3.createBucket({ Bucket: `${process.env.AWS_S3_BUCKET}-test-1` }, error => {
    if (error) {
      console.error(error); // eslint-disable-line no-console
      process.exitCode = 1;
    }
  });
} else {
  process.exitCode = 1;
}
