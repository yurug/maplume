import http from 'http';
import https from 'https';
import fs from 'fs';
import { createApp, setDbStatus } from './app';
import { config } from './config';
import { initDatabase } from './services/database';

let dbReady = false;

async function main() {
  console.log('Starting MaPlume server...');
  console.log(`Port: ${config.port}`);
  console.log(`Host: ${config.host}`);

  // Create Express app
  const app = createApp();

  // Create HTTP or HTTPS server
  let server: http.Server | https.Server;

  if (config.httpsEnabled && config.certPath && config.keyPath) {
    const httpsOptions = {
      cert: fs.readFileSync(config.certPath),
      key: fs.readFileSync(config.keyPath),
    };
    server = https.createServer(httpsOptions, app);
    console.log('HTTPS enabled');
  } else {
    server = http.createServer(app);
    console.log('Running in HTTP mode');
  }

  // Start listening BEFORE database init (so health checks work)
  server.listen(config.port, config.host, () => {
    const protocol = config.httpsEnabled ? 'https' : 'http';
    console.log(`Server running at ${protocol}://${config.host}:${config.port}`);
  });

  // Initialize database (after server is listening)
  try {
    console.log('Connecting to database...');
    // Log database URL with password hidden
    const safeUrl = config.databaseUrl.replace(/:[^:@]+@/, ':***@');
    console.log(`Database URL: ${safeUrl}`);

    // Parse URL to show more details
    try {
      const url = new URL(config.databaseUrl);
      console.log(`  Host: ${url.hostname}`);
      console.log(`  Port: ${url.port || '5432'}`);
      console.log(`  Database: ${url.pathname.replace('/', '')}`);
      console.log(`  Username: ${url.username}`);
      console.log(`  SSL: ${url.searchParams.get('sslmode') || 'disabled'}`);
    } catch {
      console.log('  (Could not parse URL)');
    }

    await initDatabase();
    dbReady = true;
    setDbStatus(true);
    console.log('Database initialized successfully');
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    console.error('Database initialization failed:');
    console.error(`  Error: ${error.message}`);
    if (error.code) {
      console.error(`  Code: ${error.code}`);
    }
    console.error('  Full error:', err);
    setDbStatus(false, `${error.code || 'UNKNOWN'}: ${error.message}`);
    console.log('Server running without database - will retry on requests');
  }

  // Graceful shutdown
  const shutdown = () => {
    console.log('\nShutting down...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { dbReady };
