// Mock dependencies FIRST
jest.mock('@modelcontextprotocol/sdk/server/mcp');
jest.mock('@modelcontextprotocol/sdk/server/stdio');
jest.mock('../src/jira/jiraApi');
jest.mock('../src/git/gitApi');
jest.mock('../src/utils/fileWatcher', () => ({
    watchFileChanges: jest.fn().mockReturnValue({ close: jest.fn() })
}));

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { createMcpServer, startServer } from '../src/server';
import * as jiraApi from '../src/jira/jiraApi';
import * as gitApi from '../src/git/gitApi';
import * as fileWatcher from '../src/utils/fileWatcher';

// Define mock functions for the methods we use
const mockTool = jest.fn();
const mockConnect = jest.fn().mockResolvedValue(undefined);

// Mock the McpServer constructor to return an object with only the mocked methods
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
    McpServer: jest.fn().mockImplementation(() => ({
        tool: mockTool,
        connect: mockConnect,
        // Add mocks for other McpServer methods if they are called by the code under test
    }))
}));

// Access the mocked constructor AFTER imports
const MockedMcpServer = McpServer as jest.MockedClass<typeof McpServer>;
const MockedStdioTransport = StdioServerTransport as jest.MockedClass<typeof StdioServerTransport>;

describe('MCP Server Implementation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // No need to reset implementation here as the mock factory does it
    });

    describe('createMcpServer', () => {
        test('should initialize McpServer and return instance with mocked methods', () => {
            const serverInstance = createMcpServer();
            // Check if the constructor was called
            expect(MockedMcpServer).toHaveBeenCalledWith(expect.objectContaining({
                name: "Jira-Git Integration",
                version: "1.0.0"
            }));
             // Check if the returned instance has the mocked methods (indirectly checks mock implementation)
            expect(serverInstance.tool).toBe(mockTool);
            expect(serverInstance.connect).toBe(mockConnect);
        });
        
        test('should register the getJiraIssue tool', () => {
            createMcpServer();
            expect(mockTool).toHaveBeenCalledWith(
                'getJiraIssue', // Tool name
                expect.any(Object), // Zod schema
                expect.any(Function) // Handler function
            );
        });

        test('should register the createGitBranchAndPR tool', () => {
            createMcpServer();
            expect(mockTool).toHaveBeenCalledWith(
                'createGitBranchAndPR',
                expect.any(Object), // zod schema
                expect.any(Function) // handler function
            );
        });

        test('should register the updateJiraStatus tool', () => {
            createMcpServer();
            expect(mockTool).toHaveBeenCalledWith(
                'updateJiraStatus',
                expect.any(Object), // zod schema
                expect.any(Function) // handler function
            );
        });
    });
    
    describe('startServer', () => {
        // Mock process functions
        const mockProcessOn = jest.spyOn(process, 'on').mockImplementation(() => process);
        const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
        const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
        const mockWatcherClose = jest.fn();

        beforeEach(() => {
            jest.clearAllMocks();
            // Re-apply mock implementation if needed, though should be set by mock factory
             (fileWatcher.watchFileChanges as jest.Mock).mockReturnValue({ close: mockWatcherClose });
        });

        afterAll(() => {
            // Restore original process functions
            mockProcessOn.mockRestore();
            mockProcessExit.mockRestore();
            mockConsoleLog.mockRestore();
            mockConsoleError.mockRestore();
        });

        test('should create server, watcher, connect transport, and set signal handlers', async () => {
            await startServer();
            
            expect(MockedMcpServer).toHaveBeenCalled(); // Checks constructor call
            expect(fileWatcher.watchFileChanges).toHaveBeenCalled();
            expect(MockedStdioTransport).toHaveBeenCalled();
            // Ensure connect was called on the instance returned by the mock constructor
            expect(mockConnect).toHaveBeenCalledWith(expect.any(MockedStdioTransport)); 
            expect(mockConsoleLog).toHaveBeenCalledWith('MCP Server started');
            
            // Check signal handlers registration
            expect(mockProcessOn).toHaveBeenCalledWith('SIGINT', expect.any(Function));
            expect(mockProcessOn).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
        });

        test('should handle connection error during startup', async () => {
            const connectionError = new Error('Connection failed');
            mockConnect.mockRejectedValueOnce(connectionError);
            
            await startServer();
            
            expect(mockConsoleError).toHaveBeenCalledWith('Error during server connection:', connectionError);
            expect(mockWatcherClose).toHaveBeenCalled(); // Ensure watcher is closed on error
            expect(mockProcessExit).toHaveBeenCalledWith(1);
        });
        
        // Testing the actual shutdown logic triggered by signals is complex 
        // because it involves invoking the callback passed to process.on.
        // We primarily tested the registration of handlers.
    });

}); 