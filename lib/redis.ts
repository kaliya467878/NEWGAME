import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

function createClient() {
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 1000 });
  }
  return new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 1,
    connectTimeout: 1000,
  });
}

let activeClient: Redis | null = null;

function getClient(): Redis {
  if (activeClient) return activeClient;

  if (globalForRedis.redis) {
    activeClient = globalForRedis.redis;
    return activeClient;
  }

  const client = createClient();
  activeClient = client;

  // Save to globalThis in both development and production to reuse connections across serverless warm containers
  globalForRedis.redis = client;

  return client;
}

export const redis = new Proxy({} as Redis, {
  get(target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
