import { Queue } from 'bullmq';

export let nfeQueue: Queue | undefined;
if (process.env.REDIS_HOST) {
  const connection = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT || 6379),
  };

  nfeQueue = new Queue('nfeQueue', { connection });
}

export default nfeQueue;
