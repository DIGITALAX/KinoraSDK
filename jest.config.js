module.exports = {
  preset: "ts-jest",
  testEnvironment: 'node',
  setupFilesAfterEnv: ["./jest.setup.after.env.ts"],
  testMatch: [
    "<rootDir>/test/**/*.test.[jt]s?(x)",
    "<rootDir>/test/**/*.spec.[jt]s?(x)",
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.jsx?$": "babel-jest", 
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
