import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || "http://rustfs:9000",
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || "rustfsadmin",
        secretAccessKey: process.env.S3_SECRET_KEY || "rustfsadmin",
    },
    forcePathStyle: true,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'datasets';

export const initBucket = async () => {
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
        console.log(`Bucket "${BUCKET_NAME}" already exists.`);
    } catch (error) {
        if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
            try {
                await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
                console.log(`Bucket "${BUCKET_NAME}" created successfully.`);
            } catch (createError) {
                console.error(`Error creating bucket "${BUCKET_NAME}":`, createError);
            }
        } else {
            console.error(`Error checking bucket "${BUCKET_NAME}":`, error);
        }
    }
};

export { s3Client, BUCKET_NAME };
