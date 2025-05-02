import { SimpleGit, simpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
type GitConfig = {
  repoPath: string;
  defaultBranch: string;
};
type JiraIssue = {
  id: string;
  key: string;
  summary: string;
  description: string;
  status: string;
};
export const getGitConfig = (): GitConfig => {
  const repoPath = process.env.GIT_REPO_PATH;
  const defaultBranch = process.env.GIT_DEFAULT_BRANCH;
  if (!repoPath) {
    throw new Error('GIT_REPO_PATH environment variable is required');
  }
  if (!defaultBranch) {
    throw new Error('GIT_DEFAULT_BRANCH environment variable is required');
  }
  return {
    repoPath,
    defaultBranch
  };
};
export const generateBranchName = (issue: JiraIssue): string => {
  const branchSuffix = issue.summary
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-') 
    .replace(/-+/g, '-')        
    .replace(/(^-|-$)/g, '');   
  return `feature/${issue.key}-${branchSuffix}`;
};
export const createGitBranch = async (issue: JiraIssue): Promise<string> => {
  const config = getGitConfig();
  const git: SimpleGit = simpleGit(config.repoPath);
  try {
    await git.checkout(config.defaultBranch);
    await git.pull();
    const branchName = generateBranchName(issue);
    await git.checkoutBranch(branchName, config.defaultBranch);
    return branchName;
  } catch (error) {
    throw new Error(`Failed to create Git branch: ${error}`);
  }
};
export const createPullRequestTemplate = async (issue: JiraIssue): Promise<string> => {
  const config = getGitConfig();
  const jiraBaseUrl = process.env.JIRA_BASE_URL;
  if (!jiraBaseUrl) {
    throw new Error('JIRA_BASE_URL environment variable is required');
  }
  const templateDir = path.join(config.repoPath, '.github');
  const templatePath = path.join(templateDir, 'PULL_REQUEST_TEMPLATE.md');
  try {
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }
    const description = issue.description ? issue.description : '(No description provided in Jira issue)';
    const prTemplate = `
# ${issue.summary}
## Description
${description}
## Related Tasks
- [${issue.key}](${jiraBaseUrl}/browse/${issue.key})
## Checklist
- [ ] Code follows standards
- [ ] Tests written
- [ ] Documentation updated
`;
    fs.writeFileSync(templatePath, prTemplate, 'utf8');
    return prTemplate;
  } catch (error) {
    throw new Error(`Failed to create PR template: ${error}`);
  }
}; 