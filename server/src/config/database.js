import mongoose from 'mongoose';
import config from './env.js';
import { createMemoryStore } from '../repositories/memoryStore.js';
import { createMongoStore } from '../repositories/mongoStore.js';

export async function connectStore() {
  if (config.demo) {
    const store = createMemoryStore();
    await store.services.seed();
    return store;
  }
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000, autoIndex: !config.production });
  const store = createMongoStore(mongoose.connection);
  await store.initialize();
  await store.services.seed();
  return store;
}
