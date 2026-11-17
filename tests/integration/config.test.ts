import { buildMongoUri } from '../../src/config/database';
import { envSchema } from '../../src/config/env';

describe('MongoDB environment configuration', () => {
  it('requires all four MongoDB environment variables', () => {
    const result = envSchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(['DB_USERNAME', 'DB_PASSWORD', 'DB_CLUSTER_URL', 'DB_NAME']),
      );
    }
  });

  it('constructs an SRV URI and encodes credentials and database name', () => {
    const uri = buildMongoUri({
      DB_USERNAME: 'user+name',
      DB_PASSWORD: 'p@ss:/word',
      DB_CLUSTER_URL: 'cluster.example.mongodb.net',
      DB_NAME: 'english yaari',
    });

    expect(uri).toBe(
      'mongodb+srv://user%2Bname:p%40ss%3A%2Fword@cluster.example.mongodb.net/english%20yaari',
    );
  });
});
