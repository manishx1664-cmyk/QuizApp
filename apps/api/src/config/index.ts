import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const isServerless = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'quizforge-super-secret-production-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || '',
  pgliteDir: process.env.PGLITE_DIR || (isServerless ? '/tmp/pglite' : path.resolve(__dirname, '../../data/pglite')),
  uploadDir: process.env.UPLOAD_DIR || (isServerless ? '/tmp/uploads' : path.resolve(__dirname, '../../uploads')),
  nodeEnv: process.env.NODE_ENV || (isServerless ? 'production' : 'development'),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
  isServerless
};

