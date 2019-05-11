module.exports = {
  globals: { 'ts-jest': { tsConfig: 'base.tsconfig.json' } },
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/DefinitelyTyped/', '/node_modules/'],
  transform: { '\\.ts$': 'ts-jest' }
}
