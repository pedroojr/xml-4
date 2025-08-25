import { Queue } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT || 6379),
};

export const nfeQueue = new Queue('nfeQueue', { connection });

export default nfeQueue;
