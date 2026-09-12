import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().allow('').default('redis://127.0.0.1:6379'),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  SKIP_DB: Joi.string().valid('true', 'false').default('false'),
  SKIP_REDIS: Joi.string().valid('true', 'false').default('false'),
  DB_SYNC_ON_START: Joi.string().valid('true', 'false').default('false'),
  GST_RATE: Joi.number().min(0).max(1).default(0),
  OTP_DEV_MODE: Joi.string().valid('true', 'false').default('true'),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').optional(),
  CLOUDINARY_API_KEY: Joi.string().allow('').optional(),
  CLOUDINARY_API_SECRET: Joi.string().allow('').optional(),
  CLOUDINARY_FOLDER: Joi.string().default('QuickmartApp'),
});
