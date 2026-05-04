// Runs before each test file. Sets safe env defaults so importing config
// modules at test time doesn't blow up on missing env vars.

process.env.NODE_ENV = 'test';
process.env.POSTGRES_DB = process.env.POSTGRES_DB || 'test_db';
process.env.POSTGRES_USER = process.env.POSTGRES_USER || 'test_user';
process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'test_pass';
process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
process.env.S3_REGION = process.env.S3_REGION || 'us-east-1';
process.env.S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000';
process.env.S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'test';
process.env.S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'test';
process.env.S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'test-bucket';
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || 'test@example.com';
process.env.FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY || 'test-key';
