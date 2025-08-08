import Joi from 'joi';

export interface EnvSchemaType {
  PORT: number;
  NODE_ENV: 'development' | 'production';
  DATABASE_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  JWT_SECRET: string;
  BULL_BOARD_PASSWORD: string;
  GOOGLE_CLOUD_STORAGE_BUCKET_NAME: string;
}
export const envValidationSchema = Joi.object<EnvSchemaType>({
  PORT: Joi.number().required(),
  NODE_ENV: Joi.string().valid('development', 'production').required(),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  BULL_BOARD_PASSWORD: Joi.string().required(),
  GOOGLE_CLOUD_STORAGE_BUCKET_NAME: Joi.string().required(),
});
