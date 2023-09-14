module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom", // Changed from node to jsdom
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
  transformIgnorePatterns: [
    "/node_modules/(?!@walletconnect|uint8arrays).+\\.js$",
  ],
  moduleFileExtensions: ["js", "jsx", "ts", "tsx"],
  moduleDirectories: ["node_modules", "src"],
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },
};
