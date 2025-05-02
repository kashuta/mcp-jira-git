import axios from 'axios';
interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}
interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description: string;
  status: string;
}
interface JiraIssueApiResponse {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string; 
    status: {
      name: string;
    };
  };
}
interface JiraTransition {
  id: string;
  name: string;
  to: { 
    name: string;
  };
}
interface JiraTransitionsApiResponse {
  transitions: JiraTransition[];
}
export const getJiraConfig = (): JiraConfig => {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;
  if (!baseUrl) {
    throw new Error('JIRA_BASE_URL environment variable is required');
  }
  if (!email) {
    throw new Error('JIRA_EMAIL environment variable is required');
  }
  if (!apiToken) {
    throw new Error('JIRA_API_TOKEN environment variable is required');
  }
  if (!projectKey) {
    throw new Error('JIRA_PROJECT_KEY environment variable is required');
  }
  return {
    baseUrl,
    email,
    apiToken,
    projectKey
  };
};
export const getJiraIssue = async (issueId: string): Promise<JiraIssue> => {
  const config = getJiraConfig();
  try {
    const response = await axios.get<JiraIssueApiResponse>(
      `${config.baseUrl}/rest/api/2/issue/${issueId}`,
      {
        auth: {
          username: config.email,
          password: config.apiToken
        }
      }
    );
    if (!response.data?.fields?.status?.name) {
        throw new Error('Invalid Jira issue response structure');
    }
    return {
      id: response.data.id,
      key: response.data.key,
      summary: response.data.fields.summary,
      description: response.data.fields.description || '',
      status: response.data.fields.status.name
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
      const axiosError = error as any; 
      if (axiosError.response) {
        if (axiosError.response.status === 404) {
          throw new Error(`Jira issue ${issueId} not found`);
        } else if (axiosError.response.status === 401) {
          throw new Error('Authentication failed: Invalid Jira credentials');
        } else if (axiosError.response.status === 403) {
          throw new Error('Authorization failed: Insufficient permissions');
        }
      }
      throw new Error(`Axios error getting Jira issue: ${axiosError.message}`);
    }
    throw new Error(`Failed to get Jira issue: ${error instanceof Error ? error.message : String(error)}`);
  }
};
const getAvailableTransitions = async (issueId: string): Promise<JiraTransition[]> => {
  const config = getJiraConfig();
  try {
    const response = await axios.get<JiraTransitionsApiResponse>(
      `${config.baseUrl}/rest/api/2/issue/${issueId}/transitions`,
      {
        auth: {
          username: config.email,
          password: config.apiToken
        }
      }
    );
    if (!response.data?.transitions) {
        throw new Error('Invalid transitions response structure');
    }
    return response.data.transitions;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
      const axiosError = error as any; 
      if (axiosError.response && axiosError.response.status === 404) {
          throw new Error(`Jira issue ${issueId} not found when fetching transitions`);
      }
      throw new Error(`Axios error getting transitions: ${axiosError.message}`);
    }
    throw new Error(`Failed to get available transitions for issue ${issueId}: ${error instanceof Error ? error.message : String(error)}`);
  }
};
const findTransitionId = (transitions: JiraTransition[], targetStatus: string): string | null => {
  const transition = transitions.find(
    (t) => t.to.name.toLowerCase() === targetStatus.toLowerCase()
  );
  return transition ? transition.id : null;
};
export const updateJiraIssueStatus = async (
  issueId: string,
  targetStatus: string
): Promise<void> => {
  const config = getJiraConfig();
  try {
    const transitions = await getAvailableTransitions(issueId);
    const transitionId = findTransitionId(transitions, targetStatus);
    if (!transitionId) {
      throw new Error(`No transition found for status ${targetStatus}`);
    }
    await axios.post(
      `${config.baseUrl}/rest/api/2/issue/${issueId}/transitions`,
      { transition: { id: transitionId } },
      {
        auth: {
          username: config.email,
          password: config.apiToken
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`Successfully updated status for ${issueId} to ${targetStatus}`);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith('No transition found')) {
        throw new Error(`Failed to update Jira status: ${error.message}`);
    }
    if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
      const axiosError = error as any;
      if (axiosError.response) {
        if (axiosError.response.status === 401) {
          throw new Error('Authentication failed: Invalid Jira credentials');
        } else if (axiosError.response.status === 403) {
          throw new Error('Authorization failed: Insufficient permissions');
        } else if (axiosError.response.status === 400) {
          throw new Error(`Failed to update Jira status: Invalid transition request for status ${targetStatus}`);
        }
      }
      throw new Error(`Axios error updating Jira status: ${axiosError.message}`);
    }
    throw new Error(`Failed to update Jira status for ${issueId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}; 