export const env = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  databaseUrl:
    process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/fai4',
  webUrl: process.env.WEB_URL || 'http://localhost:3000'
};
