import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getJiraIssue, updateJiraIssueStatus } from "./jira/jiraApi";
import { createGitBranch, createPullRequestTemplate } from "./git/gitApi";
import { watchFileChanges } from "./utils/fileWatcher";
export const createMcpServer = (): McpServer => {
  const server = new McpServer({
    name: "Jira-Git Integration",
    version: "1.0.0"
  });
  server.tool(
    "getJiraIssue",
    { issueId: z.string() },
    async ({ issueId }) => {
      try {
        const issueData = await getJiraIssue(issueId);
        return {
          content: [{ type: "text", text: JSON.stringify(issueData) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );
  server.tool(
    "createGitBranchAndPR",
    { issueId: z.string() },
    async ({ issueId }) => {
      try {
        const issueData = await getJiraIssue(issueId);
        const branchName = await createGitBranch(issueData);
        const prTemplate = await createPullRequestTemplate(issueData);
        await updateJiraIssueStatus(issueId, "In Progress");
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ branchName, prTemplate }) 
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );
  server.tool(
    "updateJiraStatus",
    { 
      issueId: z.string(), 
      status: z.string() 
    },
    async ({ issueId, status }) => {
      try {
        await updateJiraIssueStatus(issueId, status);
        return {
          content: [{ 
            type: "text", 
            text: `Status updated to ${status} for issue ${issueId}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    }
  );
  return server;
};
export const startServer = async (): Promise<void> => {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  const watcherControls = watchFileChanges();
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down MCP server...`);
    await watcherControls.close(); 
    console.log("MCP Server shut down gracefully.");
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  try {
      await server.connect(transport);
      console.log("MCP Server started");
  } catch (error) {
      console.error("Error during server connection:", error);
      await watcherControls.close(); 
      process.exit(1);
  }
}; 