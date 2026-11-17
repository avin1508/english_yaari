import type { Server } from 'node:http';
import { app } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';

const startServer = async (): Promise<Server> => {
  await connectDatabase(env.MONGODB_URI);

  return new Promise((resolve) => {
    const server = app.listen(env.PORT, () => {
      console.info(`Server listening on port ${env.PORT}`);
      resolve(server);
    });
  });
};

const shutdown = async (server: Server): Promise<void> => {
  server.close(async (error) => {
    if (error) {
      console.error('Failed to close the HTTP server cleanly:', error);
      process.exitCode = 1;
    }

    try {
      await disconnectDatabase();
    } catch (disconnectError) {
      console.error('Failed to disconnect from MongoDB cleanly:', disconnectError);
      process.exitCode = 1;
    }
  });
};

const main = async (): Promise<void> => {
  const server = await startServer();

  process.once('SIGINT', () => {
    void shutdown(server);
  });
  process.once('SIGTERM', () => {
    void shutdown(server);
  });
};

void main().catch((error: unknown) => {
  console.error('Failed to start the server:', error);
  process.exitCode = 1;
});
