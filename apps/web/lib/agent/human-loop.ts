import { tool } from '@openai/agents';
import { z } from 'zod';
import type { PlaywrightComputer } from './computer';

//! Agent calls this when it hits a CAPTCHA, login wall, or any step that needs a human
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
