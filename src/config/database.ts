import mongoose from 'mongoose';
import { env, type EnvironmentConfig } from './env';

export const buildMongoUri = (
  config: Pick<EnvironmentConfig, 'DB_USERNAME' | 'DB_PASSWORD' | 'DB_CLUSTER_URL' | 'DB_NAME'>,
): string => {
  const username = encodeURIComponent(config.DB_USERNAME);
  const password = encodeURIComponent(config.DB_PASSWORD);
  const clusterUrl = config.DB_CLUSTER_URL;
  const databaseName = encodeURIComponent(config.DB_NAME);

  return `mongodb+srv://${username}:${password}@${clusterUrl}/${databaseName}`;
};

export const connectDatabase = async (): Promise<void> => {
  await mongoose.connect(buildMongoUri(env));
  console.info('MongoDB connected successfully.');
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  console.info('MongoDB disconnected.');
};
