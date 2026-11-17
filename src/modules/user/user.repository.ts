import { User } from './user.model';
import type { CreateUserInput } from './user.validation';
import type { Types } from 'mongoose';

export const userRepository = {
  findByEmail: async (email: string): Promise<boolean> => {
    const user = await User.exists({ email });
    return user !== null;
  },

  create: async (input: CreateUserInput): Promise<InstanceType<typeof User>> => {
    return User.create(input);
  },

  existsById: async (userId: Types.ObjectId): Promise<boolean> => {
    const user = await User.exists({ _id: userId });
    return user !== null;
  },
};
