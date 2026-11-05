// Test-only environment, evaluated before importing the application.
process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'true';
process.env.UPLOAD_DIR = './.test-uploads';
process.env.MONGODB_URI = '';
process.env.SESSION_SECRET = '';
