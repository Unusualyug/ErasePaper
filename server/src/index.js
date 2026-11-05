import config from './config/env.js';
import { connectStore } from './config/database.js';
import { createApp } from './app.js';
import { seedDemo } from './services/seedDemo.js';

const store = await connectStore();
if (config.demo) await seedDemo(store);
const { app, deletion } = createApp(store);
deletion.start();
const server = app.listen(config.port, '0.0.0.0', () =>
  console.log(
    JSON.stringify({
      event: 'server_started',
      port: config.port,
      mode: config.demo ? 'demo' : 'live',
      database: store.kind,
    }),
  ),
);
server.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
  deletion.stop();
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    deletion.stop();
    server.close(() => process.exit(0));
  });
