jest.mock('../../src/common/helpers/model');
jest.mock('../../src/common/helpers/hash');
jest.mock('../../src/auth/token');
jest.mock('../../src/auth/model');

const { register } = require('../../src/auth/service');
const { createAndSendToken } = require('../../src/auth/token');
const model = require('../../src/auth/model');
const { transaction } = require('../../src/common/helpers/model');
const hash = require('../../src/common/helpers/hash');

describe('Auth Service', () => {
  const input = {
    username: 'unregistered_user',
    email: 'unregistered_email',
    password: 'non_hashed',
  };
  const fakeClient = {};
  beforeEach(() => {
    transaction.mockImplementation(async (cb) => cb(fakeClient));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('should return userId when register new user', async () => {
    model.userByUsernameOrEmail.mockResolvedValue(null);
    hash.create.mockResolvedValue('hashed_pw');
    model.create.mockResolvedValue({ id: 'some_uuid' });
    createAndSendToken.mockResolvedValue();

    const result = await register(input);

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

  test('should throw 409 if username already registered', async () => {
    model.userByUsernameOrEmail.mockResolvedValue({
      username: 'unregistered_user',
      email: 'other_email',
    });

    await expect(register(input)).rejects.toThrow(
      'Username already registered'
    );
    expect(hash.create).not.toHaveBeenCalled();
    expect(model.create).not.toHaveBeenCalled();
    expect(createAndSendToken).not.toHaveBeenCalled();
  });

  test('should throw 409 if email already registered', async () => {
    model.userByUsernameOrEmail.mockResolvedValue({
      username: 'other_user',
      email: 'unregistered_email',
    });

    await expect(register(input)).rejects.toThrow('Email already registered');
  });

  test('should throw 409 if username and email already registered', async () => {
    model.userByUsernameOrEmail.mockResolvedValue({
      username: 'unregistered_user',
      email: 'unregistered_email',
    });

    await expect(register(input)).rejects.toThrow(
      'Username & Email already registered'
    );
  });
});
