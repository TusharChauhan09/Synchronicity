import { Agent, computerTool } from '@openai/agents';
import { PlaywrightComputer } from './computer';
import { createRequestUserControlTool } from './human-loop';

export function createBrowserAgent(computer: PlaywrightComputer) {
  return new Agent({
    name: 'browser-operator',
    instructions: `You control a web browser to complete tasks for the user.
You see the current state of the browser via screenshots.
Use the computer tool to click, type, scroll, and navigate.
Be precise with coordinates based on what you see in the screenshot.

If you see a CAPTCHA, "unusual traffic" warning, login form, or any verification wall,
call request_user_control immediately instead of trying to work around it.

When the task is complete, stop and summarize what you did.`,
    tools: [
      computerTool({ computer }),
      createRequestUserControlTool(computer),
    ],
  });
}
