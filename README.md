# MCP Server - Jira & Git Integration

## Overview

This project provides an MCP (Model Context Protocol) server that integrates with Jira and Git to automate common development workflows. It watches for file changes in a specified Git repository, checks the current branch for a Jira issue key, and updates the corresponding Jira issue status.

Additionally, it exposes MCP tools for:
*   Retrieving Jira issue details (`getJiraIssue`).
*   Creating a Git feature branch and a basic Pull Request template from a Jira issue (`createGitBranchAndPR`).
*   Manually updating a Jira issue status (`updateJiraStatus`).

## Features

*   **Automatic Jira Status Updates**: Monitors file changes and updates linked Jira issues (e.g., to "In Progress") when code changes are detected on a feature branch.
*   **MCP Tool Integration**: Provides tools callable by MCP clients (like AI agents or IDE extensions) to interact with Jira and Git.
*   **Configurable**: Uses environment variables for Jira/Git credentials and behavior.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd mcp-server 
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Configure Environment Variables:**
    Create a `.env` file in the project root by copying `.env.example`:
    ```bash
    cp .env.example .env
    ```
    
    Then edit the `.env` file with your specific settings:
    ```bash
    # Jira Configuration
    JIRA_BASE_URL=https://<your-domain>.atlassian.net # Your Jira instance URL
    JIRA_EMAIL=<your-jira-email>
    JIRA_API_TOKEN=<your-jira-api-token> # Generate from Jira Account Settings > Security > API token
    JIRA_PROJECT_KEY=<YOUR_PROJ_KEY> # e.g., PROJ
    JIRA_UPDATE_STATUS="In Progress" # Target status for automatic updates
    
    # Git Configuration
    GIT_REPO_PATH=/path/to/your/local/repository # Absolute path to the Git repo to monitor
    GIT_DEFAULT_BRANCH=main # Or your default branch (e.g., develop)
    
    # Optional Debug Configuration
    # DEBUG=1 # Uncomment to enable debug mode
    # LOG_LEVEL=info # Options: debug, info, warn, error
    ```
    *   Replace placeholders with your actual Jira credentials, project key, desired status, Git repository path, and default branch.
    *   To generate a Jira API token, go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens) > Security > Create and manage API tokens.

## Running the Server

*   **Development (with auto-restart on changes):**
    ```bash
    npm run dev
    ```
*   **Production (build first):**
    ```bash
    npm run build
    npm start
    ```

The server will start and connect using STDIN/STDOUT for MCP communication.

## Usage (MCP Client)

An MCP client can connect to this server (via STDIN/STDOUT when run) and call the following tools:

*   **`getJiraIssue`**: 
    *   Input: `{ "issueId": "PROJ-123" }`
    *   Output: JSON string containing Jira issue details.
*   **`createGitBranchAndPR`**:
    *   Input: `{ "issueId": "PROJ-123" }`
    *   Output: JSON string `{ "branchName": "feature/PROJ-123-summary", "prTemplate": "..." }`
    *   Side effects: Creates the Git branch, writes `.github/PULL_REQUEST_TEMPLATE.md`, updates Jira status to `JIRA_UPDATE_STATUS`.
*   **`updateJiraStatus`**:
    *   Input: `{ "issueId": "PROJ-123", "status": "Done" }`
    *   Output: Confirmation message.
    *   Side effects: Updates the Jira issue status.

## File Watching Behavior

When the server is running (`npm start` or `npm run dev`):

1.  It monitors the directory specified by `GIT_REPO_PATH` for file changes (ignoring `.git`, `node_modules`, `dist`).
2.  On detecting a change (`add`, `change`, `unlink`):
    *   It checks the *current* branch name of the repository.
    *   It extracts a Jira issue key (e.g., `PROJ-123`) from the branch name (expected format: `type/KEY-123-description`).
    *   It checks if there are uncommitted Git changes (`git status`).
    *   If an issue key is found AND there are Git changes, it attempts to update the corresponding Jira issue's status to the value defined in the `JIRA_UPDATE_STATUS` environment variable.

## Environment Variables

*   `JIRA_BASE_URL`: Base URL of your Jira instance.
*   `JIRA_EMAIL`: Email associated with your Jira account.
*   `JIRA_API_TOKEN`: Your Jira API token.
*   `JIRA_PROJECT_KEY`: The project key for your Jira project.
*   `JIRA_UPDATE_STATUS`: The target status name in Jira to set when file changes are detected (e.g., "In Progress", "Development").
*   `GIT_REPO_PATH`: Absolute path to the local Git repository to monitor.
*   `GIT_DEFAULT_BRANCH`: The default branch of the repository (e.g., `main`, `master`, `develop`).
*   `DEBUG`: Set to `1` to enable debug mode (optional).
*   `LOG_LEVEL`: Set logging level - `debug`, `info`, `warn`, `error` (optional, defaults to `info`).

## Testing

Run unit tests:
```bash
npm test
```
