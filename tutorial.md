# MCP Server - Jira & Git Integration Tutorial

This tutorial will guide you through setting up and using the MCP Server for Jira and Git integration, enabling automation of your development workflow.

## Prerequisites

Before you begin, ensure you have:

- [Node.js](https://nodejs.org/) (v14 or later) installed
- A Jira account with API token
- A Git repository you want to monitor
- Basic familiarity with terminal/command line

## Step 1: Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Step 2: Configuration

1. Create your environment configuration:
   ```bash
   cp .env.example .env
   ```

2. Open the `.env` file in your favorite editor and fill in the values:
   ```
   # Jira Configuration
   JIRA_BASE_URL=https://your-domain.atlassian.net
   JIRA_EMAIL=your-email@example.com
   JIRA_API_TOKEN=your-jira-api-token
   JIRA_PROJECT_KEY=PROJ
   JIRA_UPDATE_STATUS="In Progress"
   
   # Git Configuration
   GIT_REPO_PATH=/absolute/path/to/your/repository
   GIT_DEFAULT_BRANCH=main
   ```

3. Get your Jira API token:
   - Go to [Atlassian Account Settings](https://id.atlassian.net/manage-profile/security/api-tokens)
   - Click "Create API token"
   - Give it a name (e.g., "MCP Server")
   - Copy the token to your `.env` file

## Step 3: Running the Server

Start the server in development mode (with auto-reload):
```bash
npm run dev
```

Or build and run in production mode:
```bash
npm run build
npm start
```

The server will connect via STDIN/STDOUT for MCP communication.

## Step 4: Using MCP Tools

Once the server is running, you can use it with an MCP client. Below are examples of the available tools:

### Get Jira Issue Details

```json
// Input
{
  "tool": "getJiraIssue",
  "input": { "issueId": "PROJ-123" }
}

// Output
{
  "id": "10001",
  "key": "PROJ-123",
  "summary": "Implement feature X",
  "description": "As a user, I want to...",
  "status": "To Do"
}
```

### Create Git Branch and PR Template

```json
// Input
{
  "tool": "createGitBranchAndPR",
  "input": { "issueId": "PROJ-123" }
}

// Output
{
  "branchName": "feature/PROJ-123-implement-feature-x",
  "prTemplate": "# Implement feature X\n\n## Description\nAs a user, I want to...\n\n## Related Tasks\n- [PROJ-123](https://your-domain.atlassian.net/browse/PROJ-123)\n\n## Checklist\n- [ ] Code follows standards\n- [ ] Tests written\n- [ ] Documentation updated\n"
}
```

### Update Jira Issue Status

```json
// Input
{
  "tool": "updateJiraStatus",
  "input": { "issueId": "PROJ-123", "status": "Done" }
}

// Output
{
  "message": "Successfully updated status for PROJ-123 to Done"
}
```

## Step 5: Setting Up Automatic File Watching

The automatic file watching is enabled by default when the server is running. It will:

1. Monitor the Git repository specified in `GIT_REPO_PATH`
2. When file changes are detected, check the current branch name for a Jira issue key
3. If the branch follows the format `type/PROJ-123-description` and there are uncommitted changes, update the issue status to the value in `JIRA_UPDATE_STATUS`

To verify it's working:
1. Make sure you're in a branch named according to the pattern (e.g., `feature/PROJ-123-implement-feature`)
2. Make a change to a file in the repository
3. Check the server logs - you should see a message indicating the Jira issue status was updated

## Step 6: Integration with Cursor or Other MCP Clients

To connect to this server from Cursor:

1. Install Cursor AI from [cursor.sh](https://cursor.sh)
2. Configure the MCP Server connection in Cursor's settings
3. Point to the running MCP Server process
4. In Cursor, you can now interact with the MCP Server using commands like:
   - "Get details for Jira issue PROJ-123"
   - "Create a branch for issue PROJ-123"
   - "Update status of PROJ-123 to Done"

## Troubleshooting

### Common Issues

1. **Cannot connect to Jira API**
   - Check your Jira credentials in `.env`
   - Ensure your API token has the necessary permissions
   - Verify your Jira domain is correct

2. **Git operations failing**
   - Ensure the `GIT_REPO_PATH` is correct and absolute
   - Check that you have proper Git credentials set up
   - Verify the `GIT_DEFAULT_BRANCH` exists

3. **File watcher not updating Jira status**
   - Check that your branch name follows the expected format
   - Ensure there are actually uncommitted changes in Git
   - Verify the target status in `JIRA_UPDATE_STATUS` exists in your Jira workflow

### Logs and Debugging

Enable debug mode by setting in your `.env`:
```
DEBUG=1
LOG_LEVEL=debug
```

This will provide more detailed logging to help diagnose issues.

## Advanced Usage

### Custom Status Workflows

You can customize the automatic status updates by changing the `JIRA_UPDATE_STATUS` variable. Ensure the status name exists in your Jira project workflow.

### Using with CI/CD

You can use this server in a CI/CD pipeline by:
1. Setting up environment variables in your CI/CD system
2. Running the server at the start of your pipeline
3. Using the MCP tools to automate Git and Jira operations during the build/deploy process

## Best Practices

1. **Security**:
   - Never commit your `.env` file to version control
   - Rotate your Jira API token periodically
   - Use a dedicated Jira account for automation

2. **Workflow**:
   - Set up branch naming conventions in your team to ensure consistency
   - Document the expected branch format for team members
   - Consider setting up Git hooks to enforce naming conventions

## Next Steps

- Explore extending the server with additional tools
- Consider contributing to the project
- Set up automated tests for your integration 