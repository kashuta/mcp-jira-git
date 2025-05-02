// Mock axios FIRST
jest.mock('axios');

import axios from 'axios';
import { getJiraConfig, getJiraIssue, updateJiraIssueStatus } from '../../src/jira/jiraApi';

// Define mocked constant AFTER import
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Environment variables for tests
process.env.JIRA_BASE_URL = 'https://jira.example.com';
process.env.JIRA_EMAIL = 'testuser';
process.env.JIRA_API_TOKEN = 'testtoken';
process.env.JIRA_PROJECT_KEY = 'PROJ';

// Store original env variables
const originalEnv = process.env;

describe('Jira API Functions', () => {
  beforeEach(() => {
    // Reset mocks and environment variables before each test
    jest.clearAllMocks();
    process.env = { ...originalEnv }; // Restore original env
  });

  afterAll(() => {
    // Restore original env after all tests
    process.env = originalEnv;
  });

  describe('getJiraConfig', () => {
    test('should load config from environment variables', () => {
      process.env.JIRA_BASE_URL = 'https://test.jira.com';
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_API_TOKEN = 'test-token';
      process.env.JIRA_PROJECT_KEY = 'TEST';

      const config = getJiraConfig();
      expect(config).toEqual({
        baseUrl: 'https://test.jira.com',
        email: 'test@example.com',
        apiToken: 'test-token',
        projectKey: 'TEST'
      });
    });

    test('should throw error if JIRA_BASE_URL is missing', () => {
      delete process.env.JIRA_BASE_URL;
      expect(() => getJiraConfig()).toThrow('JIRA_BASE_URL environment variable is required');
    });

    test('should throw error if JIRA_EMAIL is missing', () => {
      delete process.env.JIRA_EMAIL;
      expect(() => getJiraConfig()).toThrow('JIRA_EMAIL environment variable is required');
    });

    test('should throw error if JIRA_API_TOKEN is missing', () => {
      delete process.env.JIRA_API_TOKEN;
      expect(() => getJiraConfig()).toThrow('JIRA_API_TOKEN environment variable is required');
    });
    
    test('should throw error if JIRA_PROJECT_KEY is missing', () => {
        delete process.env.JIRA_PROJECT_KEY;
        expect(() => getJiraConfig()).toThrow('JIRA_PROJECT_KEY environment variable is required');
    });
  });

  describe('getJiraIssue', () => {
    test('should return issue data when API call is successful', async () => {
      // Prepare minimal mock response
      const mockData = {
        id: '10001',
        key: 'PROJ-123',
        fields: {
          summary: 'Test Issue',
          description: 'This is a test issue',
          status: { name: 'Open' }
        }
      };
      const mockResponse = { data: mockData }; // Minimal response
      
      mockedAxios.get.mockResolvedValue(mockResponse as any); // Cast to any
      
      // Call the function being tested
      const result = await getJiraIssue('PROJ-123');
      
      // Check the result
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/issue/PROJ-123',
        {
          auth: {
            username: 'testuser',
            password: 'testtoken'
          }
        }
      );
      
      expect(result).toEqual({
        id: '10001',
        key: 'PROJ-123',
        summary: 'Test Issue',
        description: 'This is a test issue',
        status: 'Open'
      });
    });

    test('should throw error when API call fails', async () => {
      // Prepare mock error
      mockedAxios.get.mockRejectedValue(new Error('API Error'));
      
      // Check that the function throws an error
      await expect(getJiraIssue('PROJ-123')).rejects.toThrow(
        'Failed to get Jira issue: API Error'
      );
    });

    test('should throw specific error for 404 not found', async () => {
      const error = { 
        isAxiosError: true, 
        response: { status: 404 }, 
        message: 'Not Found' 
      };
      mockedAxios.get.mockRejectedValue(error);
      await expect(getJiraIssue('PROJ-404')).rejects.toThrow('Jira issue PROJ-404 not found');
    });

    test('should throw specific error for 401 unauthorized', async () => {
      const error = { 
        isAxiosError: true, 
        response: { status: 401 }, 
        message: 'Unauthorized' 
      };
      mockedAxios.get.mockRejectedValue(error);
      await expect(getJiraIssue('PROJ-401')).rejects.toThrow('Authentication failed: Invalid Jira credentials');
    });

    test('should throw specific error for 403 forbidden', async () => {
      const error = { 
        isAxiosError: true, 
        response: { status: 403 }, 
        message: 'Forbidden' 
      };
      mockedAxios.get.mockRejectedValue(error);
      await expect(getJiraIssue('PROJ-403')).rejects.toThrow('Authorization failed: Insufficient permissions');
    });
    
    test('should re-throw other axios errors', async () => {
        const error = { 
            isAxiosError: true, 
            response: { status: 500 }, 
            message: 'Server Error' 
        };
        mockedAxios.get.mockRejectedValue(error);
        await expect(getJiraIssue('PROJ-500')).rejects.toThrow('Axios error getting Jira issue: Server Error');
    });
  });

  describe('updateJiraIssueStatus', () => {
    test('should update issue status when API calls are successful', async () => {
      // Mock minimal transitions response
      const mockTransitionsData = {
        transitions: [{ id: '21', to: { name: 'In Progress' } }]
      };
      const mockTransitionsResponse = { data: mockTransitionsData }; // Minimal response
      
      // Mock minimal update response
      const mockUpdateResponse = { data: {} }; // Minimal response
      
      mockedAxios.get.mockResolvedValue(mockTransitionsResponse as any); // Cast to any
      mockedAxios.post.mockResolvedValue(mockUpdateResponse as any); // Cast to any
      
      // Call the function being tested
      await updateJiraIssueStatus('PROJ-123', 'In Progress');
      
      // Check that the API is called with correct parameters
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/issue/PROJ-123/transitions',
        {
          auth: {
            username: 'testuser',
            password: 'testtoken'
          }
        }
      );
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://jira.example.com/rest/api/2/issue/PROJ-123/transitions',
        { transition: { id: '21' } },
        {
          auth: {
            username: 'testuser',
            password: 'testtoken'
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    test('should throw error when transition is not found', async () => {
      // Mock minimal transitions response (without target transition)
      const mockTransitionsData = {
        transitions: [{ id: '31', to: { name: 'Done' } }]
      };
      const mockTransitionsResponse = { data: mockTransitionsData }; // Minimal response
      
      mockedAxios.get.mockResolvedValue(mockTransitionsResponse as any); // Cast to any
      
      // Check that the function throws an error
      await expect(updateJiraIssueStatus('PROJ-123', 'In Progress')).rejects.toThrow(
        'Failed to update Jira status: No transition found for status In Progress'
      );
    });

    test('should throw error if issue not found when fetching transitions', async () => {
      const error = { 
        isAxiosError: true, 
        response: { status: 404 }, 
        message: 'Not Found' 
      };
      // Mock the get transitions call to fail
      mockedAxios.get.mockRejectedValue(error);
      
      await expect(updateJiraIssueStatus('PROJ-404', 'In Progress')).rejects.toThrow(
        'Jira issue PROJ-404 not found when fetching transitions'
      );
      // Ensure post is not called if get transitions fails
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    test('should throw specific error for 401 during POST', async () => {
      const mockTransitionsResponse = { data: { transitions: [{ id: '21', to: { name: 'In Progress' } }] } };
      const postError = { isAxiosError: true, response: { status: 401 }, message: 'Unauthorized' };
      
      mockedAxios.get.mockResolvedValue(mockTransitionsResponse as any);
      mockedAxios.post.mockRejectedValue(postError);
      
      await expect(updateJiraIssueStatus('PROJ-123', 'In Progress')).rejects.toThrow('Authentication failed: Invalid Jira credentials');
    });

    test('should throw specific error for 403 during POST', async () => {
      const mockTransitionsResponse = { data: { transitions: [{ id: '21', to: { name: 'In Progress' } }] } };
      const postError = { isAxiosError: true, response: { status: 403 }, message: 'Forbidden' };
      
      mockedAxios.get.mockResolvedValue(mockTransitionsResponse as any);
      mockedAxios.post.mockRejectedValue(postError);
      
      await expect(updateJiraIssueStatus('PROJ-123', 'In Progress')).rejects.toThrow('Authorization failed: Insufficient permissions');
    });

    test('should re-throw other axios errors during POST', async () => {
      const mockTransitionsResponse = { data: { transitions: [{ id: '21', to: { name: 'In Progress' } }] } };
      const postError = { isAxiosError: true, response: { status: 500 }, message: 'Server Error' };
      
      mockedAxios.get.mockResolvedValue(mockTransitionsResponse as any);
      mockedAxios.post.mockRejectedValue(postError);
      
      await expect(updateJiraIssueStatus('PROJ-123', 'In Progress')).rejects.toThrow('Axios error updating Jira status: Server Error');
    });
  });
}); 