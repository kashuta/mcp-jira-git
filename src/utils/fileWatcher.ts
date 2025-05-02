import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs'; 
import { SimpleGit, simpleGit } from 'simple-git';
import { updateJiraIssueStatus } from '../jira/jiraApi';
export const extractIssueKey = async (repoPath: string): Promise<string | null> => {
  const git: SimpleGit = simpleGit(repoPath);
  try {
    const branchSummary = await git.branch();
    const currentBranch = branchSummary.current;
    const match = currentBranch.match(/\w+\/([A-Z]+-\d+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.error(`Failed to extract issue key: ${error}`);
    return null;
  }
};
export const hasGitChanges = async (repoPath: string): Promise<boolean> => {
  const git: SimpleGit = simpleGit(repoPath);
  try {
    const status = await git.status();
    return status.files.length > 0;
  } catch (error) {
    console.error('Failed to check Git status:', error);
    return false;
  }
};
export const initializeFileWatcher = (
  watchPaths: string | string[],
  options: chokidar.WatchOptions = {}
): chokidar.FSWatcher => {
  const defaultOptions: chokidar.WatchOptions = {
    ignored: [
      /(^|[\/\\])\../, 
      '**/node_modulesdist
export const handleFileChange = async (
  eventType: 'add' | 'change' | 'unlink',
  filePath: string,
  repoPath: string
): Promise<void> => {
  console.log(`File ${filePath} has been changed`);
  const changes = await hasGitChanges(repoPath);
  if (changes) {
    const issueKey = await extractIssueKey(repoPath);
    if (issueKey) {
      try {
        await updateJiraIssueStatus(issueKey, 'In Progress');
        console.log(`Updated status for issue ${issueKey} to In Progress`);
      } catch (error) {
        console.error(`Failed to update Jira status for ${issueKey}:`, error);
      }
    }
  }
};
export const watchFileChanges = (): { close: () => Promise<void> } => {
  const repoPath = process.env.GIT_REPO_PATH || '.';
  const watcher = initializeFileWatcher(repoPath);
  watcher.on('change', (filePath: string, stats?: fs.Stats) => {
     handleFileChange('change', filePath, repoPath);
  });
  return {
    close: async () => {
        console.log('Closing file watcher...');
        await watcher.close();
        console.log('File watcher closed.');
    }
  };
}; 