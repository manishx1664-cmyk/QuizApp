import serverless from 'serverless-http';
import { app } from '../../apps/api/src/server';

export const handler = serverless(app);
