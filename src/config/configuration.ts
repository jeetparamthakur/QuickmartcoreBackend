export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://param:param@localhost:5436/param',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  skipDb: process.env.SKIP_DB === 'true',
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
});
