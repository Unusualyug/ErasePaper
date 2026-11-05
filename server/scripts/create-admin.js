import mongoose from 'mongoose';
import config from '../src/config/env.js';
import { connectStore } from '../src/config/database.js';

// Controlled operator action. Registration never accepts or assigns a role.
try {
  if (config.demo) throw new Error('Disable DEMO_MODE and configure live database/session settings first.');
  const username = process.argv[2]?.trim();
  if (!username) throw new Error('Usage: npm run admin:create -- <registered-username>');
  const store = await connectStore();
  const user = await store.users.findByUsernameNormalized(username.toLocaleLowerCase('en-US'));
  if (!user) throw new Error('No local account found for that username. Register the account first.');
  if (user.role === 'admin') {
    console.log(`Account ${user.username} already has administrator access.`);
  } else {
    const admin = await store.users.update(user._id, { role: 'admin' });
    await store.logs.create({
      actorId: 'controlled_operator',
      action: 'admin.role_granted',
      targetId: admin.studentId,
    });
    console.log(`Administrator access granted to ${admin.username} (${admin.studentId}).`);
  }
  console.log(
    'Before granting access, independently confirm the account owner; mobile numbers are not verified.',
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
