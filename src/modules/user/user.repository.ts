import { User } from './user.model';
import type { CreateUserInput } from './user.validation';

export const userRepository = {
  findByEmail: async (email: string): Promise<boolean> => {
    const user = await User.exists({ email });
    return user !== null;
  },

  create: async (input: CreateUserInput): Promise<InstanceType<typeof User>> => {
    return User.create(input);
  },
};
