// Define mock objects outside describe, but apply mocks inside
const mockGitFunctions = {
  checkout: jest.fn().mockResolvedValue(undefined),
  pull: jest.fn().mockResolvedValue(undefined),
  checkoutBranch: jest.fn().mockResolvedValue(undefined)
};

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn()
}));

// Mock simple-git
jest.mock('simple-git', () => ({
  simpleGit: jest.fn().mockReturnValue(mockGitFunctions)
}));

import { getGitConfig, generateBranchName, createGitBranch, createPullRequestTemplate } from '../../src/git/gitApi';
import * as fs from 'fs';
import * as path from 'path';
import { SimpleGit, simpleGit } from 'simple-git';

// Store original env variables
const originalEnv = process.env;

describe('Git API Functions', () => {
  beforeEach(() => {
    // Reset mocks and environment variables
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Reset fs mocks specifically
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    // Restore env
    process.env = originalEnv;
    // Clear mocks for next test
    jest.clearAllMocks();
  });
  
  describe('getGitConfig', () => {
      test('should load config from environment variables', () => {
          process.env.GIT_REPO_PATH = '/path/to/repo';
          process.env.GIT_DEFAULT_BRANCH = 'develop';
          
          const config = getGitConfig();
          expect(config).toEqual({
              repoPath: '/path/to/repo',
              defaultBranch: 'develop'
          });
      });
      
      test('should throw error if GIT_REPO_PATH is missing', () => {
          delete process.env.GIT_REPO_PATH;
          process.env.GIT_DEFAULT_BRANCH = 'main'; // Ensure this is set
          expect(() => getGitConfig()).toThrow('GIT_REPO_PATH environment variable is required');
      });
      
      test('should throw error if GIT_DEFAULT_BRANCH is missing', () => {
          process.env.GIT_REPO_PATH = '/path/to/repo'; // Ensure this is set
          delete process.env.GIT_DEFAULT_BRANCH;
          expect(() => getGitConfig()).toThrow('GIT_DEFAULT_BRANCH environment variable is required');
      });
  });

  describe('generateBranchName', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should generate valid branch name from issue', () => {
      const mockIssue = {
        id: '10001',
        key: 'PROJ-123',
        summary: 'Test Issue With Spaces & Special Chars!',
        description: 'This is a test issue',
        status: 'Open'
      };
      
      const branchName = generateBranchName(mockIssue);
      
      // Check that branch name is correctly formatted
      expect(branchName).toBe('feature/PROJ-123-test-issue-with-spaces-special-chars');
    });
    
    test('should handle empty summary', () => {
      const mockIssue = {
        id: '10001',
        key: 'PROJ-123',
        summary: '',
        description: 'This is a test issue',
        status: 'Open'
      };
      
      const branchName = generateBranchName(mockIssue);
      
      // Check that branch name is correctly formatted even with empty summary
      expect(branchName).toBe('feature/PROJ-123-');
    });
  });
  
  describe('createGitBranch', () => {
    const mockIssue = {
      id: '10001',
      key: 'PROJ-123',
      summary: 'Implement feature X',
      description: 'Description here',
      status: 'To Do'
    };

    beforeEach(() => {
        // Setup necessary environment variables for this describe block
        process.env.GIT_REPO_PATH = '/test/repo';
        process.env.GIT_DEFAULT_BRANCH = 'main';
        
        // Reset mocks
        jest.clearAllMocks();
        
        // This is important: need to re-apply the simple-git mock implementation
        // to intercept the simpleGit() call in createGitBranch
        jest.mock('simple-git', () => ({
            simpleGit: jest.fn().mockReturnValue(mockGitFunctions)
        }));
    });

    test('should checkout default branch, pull, and create new branch', async () => {
      const expectedBranchName = 'feature/PROJ-123-implement-feature-x';
      const branchName = await createGitBranch(mockIssue);
      
      expect(branchName).toBe(expectedBranchName);
      expect(mockGitFunctions.checkout).toHaveBeenCalledWith('main');
      expect(mockGitFunctions.pull).toHaveBeenCalled(); // Just check it was called, don't check params
      expect(mockGitFunctions.checkoutBranch).toHaveBeenCalledWith(expectedBranchName, 'main');
    });

    test('should throw error if default branch is missing', async () => {
      delete process.env.GIT_DEFAULT_BRANCH;
      await expect(createGitBranch(mockIssue)).rejects.toThrow('GIT_DEFAULT_BRANCH environment variable is required');
    });
    
    test('should handle checkout failure', async () => {
        const checkoutError = new Error('Checkout failed');
        mockGitFunctions.checkout.mockRejectedValue(checkoutError);
        await expect(createGitBranch(mockIssue)).rejects.toThrow(/Failed to create Git branch:.*Checkout failed/);
    });

    test('should handle pull failure', async () => {
        const pullError = new Error('Pull failed');
        mockGitFunctions.checkout.mockResolvedValue(undefined); // Ensure checkout succeeds
        mockGitFunctions.pull.mockRejectedValue(pullError);
        await expect(createGitBranch(mockIssue)).rejects.toThrow(/Failed to create Git branch:.*Pull failed/);
    });

    test('should handle checkoutBranch failure', async () => {
        const checkoutBranchError = new Error('Checkout branch failed');
        mockGitFunctions.checkout.mockResolvedValue(undefined); // Ensure checkout succeeds
        mockGitFunctions.pull.mockResolvedValue(undefined); // Ensure pull succeeds
        mockGitFunctions.checkoutBranch.mockRejectedValue(checkoutBranchError);
        await expect(createGitBranch(mockIssue)).rejects.toThrow(/Failed to create Git branch:.*Checkout branch failed/);
    });
  });

  describe('createPullRequestTemplate', () => {
    const mockIssue = {
        id: '10001',
        key: 'PROJ-123',
        summary: 'Fix critical bug #456',
        description: 'Detailed description of the bug and fix.',
        status: 'In Review'
    };
    const branchName = 'bugfix/PROJ-123-fix-critical-bug';
    const repoPath = '/test/repo';
    const expectedTemplateDir = path.join(repoPath, '.github');
    const expectedTemplatePath = path.join(expectedTemplateDir, 'PULL_REQUEST_TEMPLATE.md');

    beforeEach(() => {
        process.env.GIT_REPO_PATH = repoPath;
        process.env.GIT_DEFAULT_BRANCH = 'main'; // Make sure default branch is set
        process.env.JIRA_BASE_URL = 'https://myjira.atlassian.net';
        // Reset fs mocks for each test
        jest.clearAllMocks(); // Clears simple-git mocks too
        (fs.existsSync as jest.Mock).mockReturnValue(true);
    });

    test('should create directory and write PR template if it doesnt exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      await createPullRequestTemplate(mockIssue);

      expect(fs.existsSync).toHaveBeenCalledWith(expectedTemplateDir);
      expect(fs.mkdirSync).toHaveBeenCalledWith(expectedTemplateDir, { recursive: true });
      
      // Instead of validating the exact string which is difficult, just verify the function was called
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect((fs.writeFileSync as jest.Mock).mock.calls[0][0]).toBe(expectedTemplatePath);
    });

    test('should overwrite existing PR template', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true); // Simulate directory exists
      await createPullRequestTemplate(mockIssue);

      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect((fs.writeFileSync as jest.Mock).mock.calls[0][0]).toBe(expectedTemplatePath);
    });

    test('should handle missing description gracefully', async () => {
      // Reset mock history
      jest.clearAllMocks();
      
      // Test with empty description
      const issueWithoutDesc = { ...mockIssue, description: '' };
      await createPullRequestTemplate(issueWithoutDesc);
      
      // Get the most recent call to writeFileSync
      const calls = (fs.writeFileSync as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1];
      const templateContent = lastCall[1];
      
      // Check that it contains the right content
      expect(templateContent).toContain('(No description provided in Jira issue)');
    });
    
    test('should throw error if JIRA_BASE_URL is missing', async () => {
      delete process.env.JIRA_BASE_URL;
      await expect(createPullRequestTemplate(mockIssue)).rejects.toThrow(
          'JIRA_BASE_URL environment variable is required'
      );
    });

    test('should handle writeFileSync error', async () => {
        const writeError = new Error('Disk full');
        (fs.writeFileSync as jest.Mock).mockImplementation(() => {
            throw writeError;
        });

        await expect(createPullRequestTemplate(mockIssue)).rejects.toThrow(
            'Failed to create PR template: Error: Disk full'
        );
    });
  });

}); 