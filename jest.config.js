module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js', '!src/docs/**'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};
