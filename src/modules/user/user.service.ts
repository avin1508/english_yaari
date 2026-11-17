import { ApiError } from '../../utils/ApiError';
import { userRepository } from './user.repository';
import type { CreateUserInput } from './user.validation';

const isDuplicateKeyError = (error: unknown): boolean => {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
};

export const userService = {
  createUser: async (
    input: CreateUserInput,
  ): Promise<Awaited<ReturnType<typeof userRepository.create>>> => {
    const normalizedEmail = input.email.trim().toLowerCase();
    const userInput = { ...input, email: normalizedEmail };

    if (await userRepository.findByEmail(normalizedEmail)) {
      throw new ApiError(409, 'A user with this email already exists');
    }

    try {
      return await userRepository.create(userInput);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ApiError(409, 'A user with this email already exists');
      }

      throw error;
    }
  },
};
