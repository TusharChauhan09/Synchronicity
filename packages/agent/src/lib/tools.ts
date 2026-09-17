import { tool } from '@openai/agents';
import { z } from 'zod';
import type { PlaywrightComputer } from '../computer.js';

export function createNavigateTool(computer: PlaywrightComputer) {
  return tool({
    name: 'navigate',
    description:
      'Go directly to a URL. Use this instead of search when you know the destination (docs, official sites).',
    parameters: z.object({
      url: z.string().describe('Full URL including https://'),
    }),
    execute: async ({ url }) => {
      await computer.goto(url);
      return `Navigated to ${url}`;
    },
  });
}

export function createRequestUserControlTool(computer: PlaywrightComputer) {
  return tool({
    name: 'request_user_control',
    description:
      'Pause automation and hand the browser to the user. Use for CAPTCHAs, login walls, unusual-traffic blocks, or any step that needs a human.',
    parameters: z.object({
      reason: z.string().describe('Why human help is needed'),
    }),
    execute: async ({ reason }) => {
      await computer.waitForUserControl(reason);

      if (await computer.isBlocked()) {
        return 'User finished, but the page may still show a block or CAPTCHA. Take another screenshot and decide next steps.';
      }

      return 'User finished. The page looks clear — continue the task.';
    },
  });
}
