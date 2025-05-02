import { startServer } from './server';
import * as dotenv from 'dotenv';
dotenv.config();
startServer().catch(error => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
}); 