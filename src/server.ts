import type { Server } from 'node:http';
import { app } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';

let server: Server | undefined;
let shutdownPromise: Promise<void> | undefined;

const startServer = async (): Promise<void> => {
  await connectDatabase();

  await new Promise<void>((resolve, reject) => {
    server = app.listen(env.PORT);
    server.once('listening', () => {
      console.info(`HTTP server listening on port ${env.PORT}.`);
      resolve();
    });
    server.once('error', reject);
  });
};

const shutdown = (): Promise<void> => {
  if (shutdownPromise !== undefined) {
    return shutdownPromise;
  }

  shutdownPromise = (async (): Promise<void> => {
    try {
      if (server?.listening) {
        await new Promise<void>((resolve, reject) => {
          server?.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        });
      }
    } catch (error) {
      console.error(
        'Failed to close the HTTP server:',
        error instanceof Error ? error.name : 'UnknownError',
      );
      process.exitCode = 1;
    }

    try {
      await disconnectDatabase();
    } catch (error) {
      console.error(
        'Failed to disconnect from MongoDB:',
        error instanceof Error ? error.name : 'UnknownError',
      );
      process.exitCode = 1;
    }
  })();

  return shutdownPromise;
};

const main = async (): Promise<void> => {
  process.once('SIGINT', () => {
    console.info('Received SIGINT; shutting down.');
    void shutdown();
  });
  process.once('SIGTERM', () => {
    console.info('Received SIGTERM; shutting down.');
    void shutdown();
  });
  process.once('unhandledRejection', (reason: unknown) => {
    console.error(
      'Unhandled promise rejection:',
      reason instanceof Error ? reason.name : 'UnknownError',
    );
    process.exitCode = 1;
    void shutdown();
  });
  process.once('uncaughtException', (error: Error) => {
    console.error('Uncaught exception:', error.name);
    process.exitCode = 1;
    void shutdown();
  });

  await startServer();
};

void main().catch((error: unknown) => {
  console.error(
    'Failed to start the application:',
    error instanceof Error ? error.name : 'UnknownError',
  );
  process.exitCode = 1;
  void shutdown();
});
