import * as chokidar from 'chokidar';
import { SimpleGit } from 'simple-git';
import { updateJiraIssueStatus } from '../../src/jira/jiraApi';
import * as fileWatcher from '../../src/utils/fileWatcher';

// Mock dependencies
jest.mock('simple-git');
jest.mock('chokidar');
jest.mock('../../src/jira/jiraApi');

// Import the module under test
import * as jiraApi from '../../src/jira/jiraApi';

// Because we can't easily partial mock our own module, we'll spy on the exported functions
jest.spyOn(fileWatcher, 'extractIssueKey');
jest.spyOn(fileWatcher, 'hasGitChanges');

describe('File Watcher Functions', () => {
  // Constants for tests
  const repoPath = '/test/repo';
  const filePath = '/test/repo/src/file.ts';
  const issueKey = 'PROJ-123';
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractIssueKey', () => {
    test('should extract issue key from branch name with feature/ prefix', async () => {
      // Mock the git functionality
      const mockGit = {
        branch: jest.fn().mockResolvedValue({ current: 'feature/PROJ-123-test-branch' })
      };
      
      // Setup the simpleGit mock
      require('simple-git').simpleGit.mockReturnValue(mockGit);
      
      // Call the function
      const result = await fileWatcher.extractIssueKey(repoPath);
      
      // Verify results
      expect(result).toBe('PROJ-123');
    });
  });
  
  describe('hasGitChanges', () => {
    test('should return true when git status shows changes', async () => {
      // Mock the git functionality to return files (indicating changes)
      const mockGit = {
        status: jest.fn().mockResolvedValue({ files: [{ path: 'file.ts' }] })
      };
      
      // Setup the simpleGit mock
      require('simple-git').simpleGit.mockReturnValue(mockGit);
      
      // Call the function
      const result = await fileWatcher.hasGitChanges(repoPath);
      
      // Verify results
      expect(result).toBe(true);
    });
    
    test('should return false when git status shows no changes', async () => {
      // Mock the git functionality to return no files
      const mockGit = {
        status: jest.fn().mockResolvedValue({ files: [] })
      };
      
      // Setup the simpleGit mock
      require('simple-git').simpleGit.mockReturnValue(mockGit);
      
      // Call the function
      const result = await fileWatcher.hasGitChanges(repoPath);
      
      // Verify results
      expect(result).toBe(false);
    });
  });
  
  describe('initializeFileWatcher', () => {
    test('should set up chokidar watch with correct options', () => {
      // Mock for chokidar.watch to return a mock watcher
      const mockWatcher = { on: jest.fn() };
      (chokidar.watch as jest.Mock).mockReturnValue(mockWatcher);
      
      // Call the function
      fileWatcher.initializeFileWatcher(repoPath);
      
      // Verify chokidar.watch was called with the right path
      expect(chokidar.watch).toHaveBeenCalledWith(repoPath, expect.objectContaining({
        persistent: true,
        ignoreInitial: true
      }));
      
      // Verify error handler is set up
      expect(mockWatcher.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });
  
  describe('handleFileChange', () => {
    test('should update Jira status when issue key exists and changes detected', async () => {
      // Setup environment variable needed
      process.env.JIRA_UPDATE_STATUS = 'In Progress';
      
      // Mock dependencies
      const mockGit = {
        branch: jest.fn().mockResolvedValue({ current: 'feature/PROJ-123-test-branch' }),
        status: jest.fn().mockResolvedValue({ files: [{ path: 'file.ts' }] })
      };
      
      // Apply mocks
      require('simple-git').simpleGit.mockReturnValue(mockGit);
      
      // Call the function
      await fileWatcher.handleFileChange('change', filePath, repoPath);
      
      // Verify that updateJiraIssueStatus was called correctly
      expect(jiraApi.updateJiraIssueStatus).toHaveBeenCalledWith('PROJ-123', 'In Progress');
    });
  });
  
  describe('watchFileChanges', () => {
    test('should set up watcher for repo path from environment', () => {
      // Mock environment variable
      process.env.GIT_REPO_PATH = repoPath;
      
      // Mock watcher instance
      const mockWatcher = { 
        on: jest.fn().mockReturnThis(),
        close: jest.fn().mockResolvedValue(undefined)
      };
      
      // Apply mock
      (chokidar.watch as jest.Mock).mockReturnValue(mockWatcher);
      
      // Call the function
      const watcher = fileWatcher.watchFileChanges();
      
      // Verify watcher setup
      expect(chokidar.watch).toHaveBeenCalled();
      expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
      
      // Verify close function
      expect(watcher.close).toBeInstanceOf(Function);
    });
  });
}); 