jest.mock('../../src/common/helpers/model');
jest.mock('../../src/common/helpers/hash');
jest.mock('../../src/auth/token');
jest.mock('../../src/auth/model');
jest.mock('../../src/config/redis');

const {
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
  validateRefreshToken,
  getById,
} = require('../../src/auth/service');
const { createAndSendToken, issueTokens } = require('../../src/auth/token');
const model = require('../../src/auth/model');
const redis = require('../../src/config/redis');
const { transaction } = require('../../src/common/helpers/model');
const hash = require('../../src/common/helpers/hash');

describe('Auth Service', () => {
  const fakeClient = {};
  describe('Register', () => {
    const input = {
      username: 'unregistered_user',
      email: 'unregistered_email',
      password: 'non_hashed',
    };
    beforeEach(() => {
      transaction.mockImplementation(async (cb) => cb(fakeClient));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });
    test('should throw 409 if username already registered', async () => {
      // Arrange
      model.userByUsernameOrEmail.mockResolvedValue({
        username: 'unregistered_user',
        email: 'other_email',
      });

      // Assert
      await expect(register(input)).rejects.toThrow(
        'Username already registered'
      );
      expect(hash.create).not.toHaveBeenCalled();
      expect(model.create).not.toHaveBeenCalled();
      expect(createAndSendToken).not.toHaveBeenCalled();
    });

    test('should throw 409 if email already registered', async () => {
      // Arrange
      model.userByUsernameOrEmail.mockResolvedValue({
        username: 'other_user',
        email: 'unregistered_email',
      });

      // Assert
      await expect(register(input)).rejects.toThrow('Email already registered');
      expect(hash.create).not.toHaveBeenCalled();
      expect(model.create).not.toHaveBeenCalled();
      expect(createAndSendToken).not.toHaveBeenCalled();
    });

    test('should throw 409 if username and email already registered', async () => {
      // Arrange
      model.userByUsernameOrEmail.mockResolvedValue({
        username: 'unregistered_user',
        email: 'unregistered_email',
      });

      // Assert
      await expect(register(input)).rejects.toThrow(
        'Username & Email already registered'
      );
      expect(hash.create).not.toHaveBeenCalled();
      expect(model.create).not.toHaveBeenCalled();
      expect(createAndSendToken).not.toHaveBeenCalled();
    });

    test('should throw error when model create failed', async () => {
      // Arrange
      model.userByUsernameOrEmail.mockResolvedValue(null);
      hash.create.mockResolvedValue('some_uuid');
      model.create.mockRejectedValue(new Error());

      // Assert
      await expect(register(input)).rejects.toThrow();
      expect(createAndSendToken).not.toHaveBeenCalled();
    });

    test('should return userId when register new user', async () => {
      // Arrange
      model.userByUsernameOrEmail.mockResolvedValue(null);
      hash.create.mockResolvedValue('hashed_pw');
      model.create.mockResolvedValue({ id: 'some_uuid' });
      createAndSendToken.mockResolvedValue();

      // Act
      const result = await register(input);

      // Assert
      expect(model.userByUsernameOrEmail).toHaveBeenCalledWith({
        username: 'unregistered_user',
        email: 'unregistered_email',
      });
      expect(hash.create).toHaveBeenCalledWith('non_hashed');
      expect(model.create).toHaveBeenCalledWith({
        client: fakeClient,
        username: 'unregistered_user',
        email: 'unregistered_email',
        hashed: 'hashed_pw',
      });
      expect(createAndSendToken).toHaveBeenCalledWith({
        userId: 'some_uuid',
        email: 'unregistered_email',
        type: 'email',
        subject: 'Verify your email',
        ttlMinutes: 60,
      });
      expect(result).toEqual({ userId: 'some_uuid' });
    });
  });

  describe('Verify Email', () => {
    beforeEach(() => {
      transaction.mockImplementation(async (cb) => cb(fakeClient));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should throw error when user not registered', async () => {
      // Arrange
      redis.get.mockResolvedValue(null);

      // Assert
      await expect(verifyEmail('some_token')).rejects.toThrow();
      expect(model.userByIdentifier).not.toHaveBeenCalled();
    });

    test('should throw error when user already deleted', async () => {
      // Arrange
      redis.get.mockResolvedValue('some_uuid');
      model.userByIdentifier.mockResolvedValue({
        id: 'some_uuid',
        deleted_at: 'user_deleted',
        email_verified_at: null,
      });

      //Assert
      await expect(verifyEmail('some_token')).rejects.toThrow();
    });

    test('should throw error when user already verified', async () => {
      // Arrange
      redis.get.mockResolvedValue('some_uuid');
      model.userByIdentifier.mockResolvedValue({
        id: 'some_uuid',
        deleted_at: null,
        email_verified_at: 'user_verified',
      });

      // Assert
      await expect(verifyEmail('some_token')).rejects.toThrow();
    });

    test('should throw error when no token given', async () => {
      // Assert
      await expect(verifyEmail()).rejects.toThrow();
    });

    test('should return username and user ID when email verify success', async () => {
      // Arrange
      redis.get.mockResolvedValue('some_uuid');
      model.userByIdentifier.mockResolvedValue({
        id: 'some_uuid',
        deleted_at: null,
        email_verified_at: null,
      });
      const key = 'email-token:some_token';
      transaction.mockResolvedValue({
        username: 'registered_user',
      });

      // Act
      const result = await verifyEmail('some_token');

      // Assert
      expect(redis.get).toHaveBeenCalledWith(key);
      expect(model.userByIdentifier).toHaveBeenCalled();
      expect(transaction).toHaveBeenCalled();
      expect(result).toEqual({
        userId: 'some_uuid',
        username: 'registered_user',
      });
    });
  });

  describe('Resend Verification Email', () => {
    beforeEach(() => {
      transaction.mockImplementation(async (cb) => cb(fakeClient));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should throw error when user not registered', async () => {
      // Arrange
      model.userByIdentifier.mockResolvedValue(null);

      // Assert
      await expect(
        resendVerification({
          username: 'registered_user',
          password: 'non_hashed',
        })
      ).rejects.toThrow();
    });

    test('should throw error when user already deleted', async () => {
      // Arrange
      redis.get.mockResolvedValue('some_uuid');
      model.userByIdentifier.mockResolvedValue({
        id: 'some_uuid',
        deleted_at: 'user_deleted',
        email_verified_at: null,
      });

      // Assert
      await expect(
        resendVerification({
          username: 'registered_user',
          password: 'non_hashed',
        })
      ).rejects.toThrow();
    });

    test('should throw error when user already verified', async () => {
      // Arrange
      redis.get.mockResolvedValue('some_uuid');
      model.userByIdentifier.mockResolvedValue({
        id: 'some_uuid',
        deleted_at: null,
        email_verified_at: 'user_verified',
      });

      // Assert
      await expect(
        resendVerification({
          username: 'registered_user',
          password: 'non_hashed',
        })
      ).rejects.toThrow();
    });

    test('should throw error when send token failed', async () => {
      // Arrange
      redis.get.mockResolvedValue('some_uuid');
      model.userByIdentifier.mockResolvedValue({
        id: 'some_uuid',
        deleted_at: null,
        email_verified_at: 'user_verified',
      });
      createAndSendToken.mockResolvedValue(new Error());

      // Assert
      await expect(
        resendVerification({
          username: 'registered_user',
          password: 'non_hashed',
        })
      ).rejects.toThrow();
    });

    test('should return username and user ID when resend email verification', async () => {
      // Arrange
      model.userByIdentifier.mockResolvedValue({
        id: 'some_uuid',
        deleted_at: null,
        email_verified_at: null,
      });
      hash.verify.mockResolvedValue(true);
      createAndSendToken.mockResolvedValue();
      const input = {
        username: 'registered_user',
        password: 'non_hashed',
      };

      // Act
      const result = await resendVerification(input);

      // Assert
      expect(model.userByIdentifier).toHaveBeenCalled();
      expect(result).toEqual({
        userId: 'some_uuid',
        message: 'Verification email has been resent',
      });
    });
  });

  describe('Login', () => {
    const input = {
      username: 'registered_user',
      password: 'non_hashed',
    };
    beforeEach(() => {
      transaction.mockImplementation(async (cb) => cb(fakeClient));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should throw error when user not registered', async () => {
      // Arrange
      model.userByIdentifier.mockResolvedValue(null);

      // Assert
      await expect(login(input)).rejects.toThrow();
    });

    test('should throw error when user already deleted', async () => {
      // Arrange
      model.userByIdentifier.mockResolvedValue({
        id: 'some_uuid',
        password: 'hashed_pw',
        deleted_at: 'user_deleted',
        email_verified_at: 'user_verified',
      });

      // Assert
      await expect(login(input)).rejects.toThrow();
    });

    test('should throw error when user not verified', async () => {
      // Arrange
      model.userByIdentifier.mockResolvedValue({
        id: 'some_uuid',
        password: 'hashed_pw',
        deleted_at: null,
        email_verified_at: null,
      });

      // Assert
      await expect(login(input)).rejects.toThrow();
    });

    test('should throw error when invalid credentials', async () => {
      // Arrange
      model.userByIdentifier.mockResolvedValue({
        id: 'some_uuid',
        password: 'hashed_pw',
        deleted_at: null,
        email_verified_at: 'user_verified',
      });
      hash.verify.mockResolvedValue(false);

      // Assert
      await expect(login(input)).rejects.toThrow();
    });

    test('should return userId and some access token', async () => {
      // Arrange
      model.userByIdentifier.mockResolvedValue({
        id: 'some_uuid',
        password: 'hashed_pw',
        deleted_at: null,
        email_verified_at: 'user_verified',
      });
      issueTokens.mockResolvedValue({
        userId: 'some_uuid',
        access: 'jwt_access',
        refresh: 'jwt_refresh',
      });
      hash.verify.mockResolvedValue(true);

      // Act
      const result = await login(input);

      // Assert
      expect(model.userByIdentifier).toHaveBeenCalledWith('registered_user');
      expect(hash.verify).toHaveBeenCalled();
      expect(issueTokens).toHaveBeenCalled();
      expect(result).toEqual({
        userId: 'some_uuid',
        access: 'jwt_access',
        refresh: 'jwt_refresh',
      });
    });
  });

  describe('Forgot Password', () => {
    const input = {
      username: 'registered_user',
      password: 'non_hashed',
    };
    beforeEach(() => {
      transaction.mockImplementation(async (cb) => cb(fakeClient));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should return userId when not registered user', async () => {
      // Arrange
      model.userByIdentifier.mockResolvedValue(null);

      // Assert
      await expect(forgotPassword(input)).rejects.toThrow();
    });

    test('should return userId when user already deleted', async () => {
      // Arrange
      model.userByIdentifier.mockResolvedValue({
        id: 'some_uuid',
        deleted_at: 'user_deleted',
        email_verified_at: 'user_verified',
      });

      // Assert
      await expect(forgotPassword(input)).rejects.toThrow();
    });

    test('should return userId when user not verified', async () => {
      // Arrange
      model.userByIdentifier.mockResolvedValue({
        id: 'some_uuid',
        deleted_at: null,
        email_verified_at: null,
      });

      // Assert
      await expect(forgotPassword(input)).rejects.toThrow();
    });

    test('should return userId when forgot password', async () => {
      // Arrange
      model.userByIdentifier.mockResolvedValue({
        id: 'some_uuid',
        deleted_at: null,
        email_verified_at: 'user_verified',
      });
      createAndSendToken.mockResolvedValue();

      // Act
      const result = await forgotPassword(input);

      // Assert
      expect(model.userByIdentifier).toHaveBeenCalledWith('registered_user');
      expect(createAndSendToken).toHaveBeenCalled();
      expect(result).toEqual({
        userId: 'some_uuid',
        message: 'Check your email for reset password',
      });
    });
  });

  describe('Reset Password', () => {
    const input = {
      token: 'some_token',
      password: 'non_hashed',
    };
    const key = 'pass-token:some_token';
    beforeEach(() => {
      transaction.mockImplementation(async (cb) => cb(fakeClient));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should throw error when token expired', async () => {
      // Arrange
      redis.get.mockResolvedValue(null);

      // Assert
      await expect(resetPassword(input)).rejects.toThrow();
      expect(redis.get).toHaveBeenCalledWith(key);
      expect(model.userByIdentifier).not.toHaveBeenCalled();
      expect(hash.create).not.toHaveBeenCalled();
      expect(model.updatePass).not.toHaveBeenCalled();
      expect(redis.remove).not.toHaveBeenCalled();
    });

    test('should throw error when model failed', async () => {
      // Arrange
      redis.get.mockResolvedValue('some_uuid');
      model.userByIdentifier.mockRejectedValue(new Error());

      // Assert
      await expect(resetPassword(input)).rejects.toThrow();
      expect(redis.get).toHaveBeenCalledWith(key);
      expect(model.userByIdentifier).toHaveBeenCalledWith('some_uuid');
      expect(hash.create).not.toHaveBeenCalled();
      expect(model.updatePass).not.toHaveBeenCalled();
      expect(redis.remove).not.toHaveBeenCalled();
    });

    test('should throw error when user deleted', async () => {
      // Arrange
      redis.get.mockResolvedValue('some_uuid');
      model.userByIdentifier.mockResolvedValue({
        deleted_at: 'user_deleted',
        email_verified_at: null,
      });

      // Assert
      await expect(resetPassword(input)).rejects.toThrow();
      expect(redis.get).toHaveBeenCalledWith(key);
      expect(model.userByIdentifier).toHaveBeenCalledWith('some_uuid');
      expect(hash.create).not.toHaveBeenCalled();
      expect(model.updatePass).not.toHaveBeenCalled();
      expect(redis.remove).not.toHaveBeenCalled();
    });

    test('should throw error when user not verified', async () => {
      // Arrange
      redis.get.mockResolvedValue('some_uuid');
      model.userByIdentifier.mockResolvedValue({
        deleted_at: null,
        email_verified_at: null,
      });

      // Assert
      await expect(resetPassword(input)).rejects.toThrow();
      expect(redis.get).toHaveBeenCalledWith(key);
      expect(model.userByIdentifier).toHaveBeenCalledWith('some_uuid');
      expect(hash.create).not.toHaveBeenCalled();
      expect(model.updatePass).not.toHaveBeenCalled();
      expect(redis.remove).not.toHaveBeenCalled();
    });

    test('should throw error when model update password failed', async () => {
      // Arrange
      redis.get.mockResolvedValue('some_uuid');
      model.userByIdentifier.mockResolvedValue({
        id: 'some_uuid',
        deleted_at: null,
        email_verified_at: 'user_verified',
      });
      hash.create.mockResolvedValue('hashed_pw');
      model.updatePass.mockRejectedValue(new Error());

      // Assert
      await expect(resetPassword(input)).rejects.toThrow();
      expect(redis.get).toHaveBeenCalledWith(key);
      expect(model.userByIdentifier).toHaveBeenCalledWith('some_uuid');
      expect(hash.create).toHaveBeenCalledWith('non_hashed');
      expect(model.updatePass).toHaveBeenCalledWith({
        client: fakeClient,
        userId: 'some_uuid',
        hashed: 'hashed_pw',
      });
      expect(redis.remove).not.toHaveBeenCalled();
    });

    test('should return userId and username when reset password success', async () => {
      // Arrange
      redis.get.mockResolvedValue('some_uuid');
      model.userByIdentifier.mockResolvedValue({
        id: 'some_uuid',
        deleted_at: null,
        email_verified_at: 'user_verified',
      });
      hash.create.mockResolvedValue('hashed_pw');
      model.updatePass.mockResolvedValue({
        id: 'some_uuid',
        username: 'user_name',
      });
      redis.remove.mockResolvedValue();

      // Act
      const result = await resetPassword(input);

      // Assert
      expect(redis.get).toHaveBeenCalledWith(key);
      expect(model.userByIdentifier).toHaveBeenCalledWith('some_uuid');
      expect(hash.create).toHaveBeenCalledWith('non_hashed');
      expect(model.updatePass).toHaveBeenCalledWith({
        client: fakeClient,
        userId: 'some_uuid',
        hashed: 'hashed_pw',
      });
      expect(result).toEqual({
        userId: 'some_uuid',
        username: 'user_name',
      });
    });
  });

  describe('Refresh Token', () => {
    const input = {
      userId: 'some_uuid',
      refreshToken: 'some_token_refresh',
    };
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should throw error when user not found', async () => {
      // Arrange
      model.userById.mockResolvedValue(null);

      // Assert
      await expect(validateRefreshToken(input)).rejects.toThrow();
      expect(issueTokens).not.toHaveBeenCalled();
    });

    test('should throw error when user already deleted', async () => {
      // Arrange
      model.userById.mockResolvedValue({
        deleted_at: 'user_deleted',
      });

      // Assert
      await expect(validateRefreshToken(input)).rejects.toThrow();
      expect(issueTokens).not.toHaveBeenCalled();
    });

    test('should throw error when user has no token', async () => {
      // Arrange
      model.userById.mockResolvedValue({
        deleted_at: null,
        token: null,
      });

      // Assert
      await expect(validateRefreshToken(input)).rejects.toThrow();
      expect(issueTokens).not.toHaveBeenCalled();
    });

    test('should throw error when user token mismatch', async () => {
      // Arrange
      model.userById.mockResolvedValue({
        deleted_at: null,
        token: 'other_token',
      });

      // Assert
      await expect(validateRefreshToken(input)).rejects.toThrow();
      expect(issueTokens).not.toHaveBeenCalled();
    });

    test('should return user access and refresh', async () => {
      // Arrange
      model.userById.mockResolvedValue({
        deleted_at: null,
        token: 'some_token_refresh',
      });
      issueTokens.mockResolvedValue({
        userId: 'some_uuid',
        accessToken: 'some_token_access',
        refreshToken: 'some_token_refresh',
      });

      // Act
      const result = await validateRefreshToken(input);

      // Assert
      expect(result).toEqual({
        userId: 'some_uuid',
        accessToken: 'some_token_access',
        refreshToken: 'some_token_refresh',
      });
    });
  });

  describe('Get Profile', () => {
    const input = {};
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should throw error when db failed', async () => {
      // Arrange
      model.userById.mockRejectedValue(new Error());

      // Assert
      await expect(getById(input)).rejects.toThrow();
    });

    test('should throw error when user not found', async () => {
      // Arrange
      model.userById.mockResolvedValue(null);

      // Assert
      await expect(getById(input)).rejects.toThrow();
    });

    test('should throw error when user was deleted', async () => {
      // Arrange
      model.userById.mockResolvedValue({ deleted_at: 'some_date' });

      // Assert
      await expect(getById(input)).rejects.toThrow();
    });

    test('should return user detail when no error', async () => {
      // Arrange
      model.userById.mockResolvedValue({ id: 'some_uuid', deleted_at: null });

      // Assert
      await expect(getById(input)).resolves.toEqual({
        user: {
          id: 'some_uuid',
          deleted_at: null,
        },
      });
    });
  });
});
