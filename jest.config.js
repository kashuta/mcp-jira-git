export default {
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleNameMapper: {
    '^../src/jira/jiraApi$': '<rootDir>/src/jira/jiraApi.ts',
    '^../src/jira/jiraApi.js$': '<rootDir>/src/jira/jiraApi.ts',
    '^../../src/jira/jiraApi$': '<rootDir>/src/jira/jiraApi.ts',
    '^../../src/jira/jiraApi.js$': '<rootDir>/src/jira/jiraApi.ts',
    
    '^../src/git/gitApi$': '<rootDir>/src/git/gitApi.ts',
    '^../src/git/gitApi.js$': '<rootDir>/src/git/gitApi.ts',
    '^../../src/git/gitApi$': '<rootDir>/src/git/gitApi.ts',
    '^../../src/git/gitApi.js$': '<rootDir>/src/git/gitApi.ts',
    
    '^../src/utils/fileWatcher$': '<rootDir>/src/utils/fileWatcher.ts',
    '^../src/utils/fileWatcher.js$': '<rootDir>/src/utils/fileWatcher.ts',
    '^../../src/utils/fileWatcher$': '<rootDir>/src/utils/fileWatcher.ts',
    '^../../src/utils/fileWatcher.js$': '<rootDir>/src/utils/fileWatcher.ts',
    
    '^../src/server$': '<rootDir>/src/server.ts',
    '^../src/server.js$': '<rootDir>/src/server.ts',
    
    '^@modelcontextprotocol/sdk/server/mcp$': '<rootDir>/node_modules/@modelcontextprotocol/sdk/dist/cjs/server/mcp.js',
    '^@modelcontextprotocol/sdk/server/mcp.js$': '<rootDir>/node_modules/@modelcontextprotocol/sdk/dist/cjs/server/mcp.js',
    
    '^@modelcontextprotocol/sdk/server/stdio$': '<rootDir>/node_modules/@modelcontextprotocol/sdk/dist/cjs/server/stdio.js',
    '^@modelcontextprotocol/sdk/server/stdio.js$': '<rootDir>/node_modules/@modelcontextprotocol/sdk/dist/cjs/server/stdio.js'
  },
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
}; 