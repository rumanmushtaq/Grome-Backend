export interface IEnvSchema {
  PORT: number;
  // DB_URL: string;
  MONGODB_URI: string;
  MONGODB_TEST_URI: string;
  REDIS_HOST: string;
  REDIS_PORT: string;
  REDIS_PASSWORD: string;
  REDIS_DB: string;
  NODE_ENV: string;

  SALT_ROUNDS: number;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  SENDGRID_API_KEY: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_BUCKET: string;
  AWS_REGION: string;
  AWS_ACCESS_URL: string;
  // PINATA_API_KEY: string;
  // PINATA_SECRET_KEY: string;
  OTP_EXPIRY_TIME: number;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PUBLISHABLE_KEY: string;
  // WEBHOOK_SECRET: string;
  // RPC_URL: string;
  // CONTRACT_ADDRESS_ASSET: string;
  // CONTRACT_ADDRESS_NFT: string;
  // CONTRACT_ADDRESS_TOKEN: string;
  // AI_URL: string;
  // AI_API_KEY: string;
  // AES_PRIVATE_KEY?: string;
  // // Azure Storage (keeping for backward compatibility)
  // AzureConnection?: string;
  // ContainerClient?: string;
  // GCP Storage
  // GCP_PROJECT_ID: string;

  // GCP_BUCKET_NAME: string;
  GOOGLE_CLIENT_ID: string;
  // AZURE_AD_CLIENT_ID: string;
  // AZURE_AD_CLIENT_SECRET: string;
  // AZURE_AD_TENANT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  // GOOGLE_CLIENT_ID_IOS: string;
  // GOOGLE_CLIENT_ID_ANDROID: string;
  // APPLE_CLIENT_ID: string;
  // REFRESH_TOKEN_SECRET: string;
  // REFRESH_Expires_IN: string;
  GCP_CREDENTIALS:  string;
  APPLE_CLIENT_ID_Web:string;
  
}