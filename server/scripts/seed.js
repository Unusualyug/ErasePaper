import mongoose from 'mongoose';
import config from '../src/config/env.js';
import { connectStore } from '../src/config/database.js';
try {
  if (!config.demo) {
    const store = await connectStore();
    await store.services.seed();
    console.log(
      'Five academic services seeded. No fictitious users or requests were added to the live database.',
    );
  } else {
    console.log(
      'Demo data is seeded automatically in memory at server startup. No production records are touched.',
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
