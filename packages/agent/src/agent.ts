import { Agent, computerTool } from '@openai/agents';
import { PlaywrightComputer } from './computer.js';
import { createNavigateTool, createRequestUserControlTool } from './lib/tools.js';
import { BROWSER_PROMPT } from './prompt/browser.prompt.js';

const AGENT_INSTRUCTIONS = BROWSER_PROMPT;

export function createBrowserAgent(computer: PlaywrightComputer) {
  return new Agent({
    name: 'browser-operator',
    instructions: AGENT_INSTRUCTIONS,
    tools: [
      computerTool({ computer }),
      createNavigateTool(computer),
      createRequestUserControlTool(computer),
    ],
  });
}
