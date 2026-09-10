function resolveCloudinaryConfig() {
  const fromUrl = process.env.CLOUDINARY_URL?.match(
    /^cloudinary:\/\/([^:]+):([^@]+)@([^/?#]+)/,
  );

  return {
    cloudName:
      process.env.CLOUDINARY_CLOUD_NAME ?? (fromUrl ? fromUrl[3] : '') ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? (fromUrl ? fromUrl[1] : '') ?? '',
    apiSecret:
      process.env.CLOUDINARY_API_SECRET ?? (fromUrl ? fromUrl[2] : '') ?? '',
    folder: process.env.CLOUDINARY_FOLDER ?? 'QuickmartApp',
  };
}

export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://param:param@localhost:5436/param',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  skipDb: process.env.SKIP_DB === 'true',
  dbSyncOnStart: process.env.DB_SYNC_ON_START === 'true',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim()),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  gstRate: parseFloat(process.env.GST_RATE ?? '0'),
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  otpDevMode: process.env.OTP_DEV_MODE !== 'false',
  cloudinary: resolveCloudinaryConfig(),
});
