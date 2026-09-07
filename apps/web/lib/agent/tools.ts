import { tool } from "@openai/agents";
import { z } from "zod";

export const requestUserControlTool = tool({
  name: "request_user_control",
  description:
    "Pause and hand the live browser to the human for login, 2FA, captcha, payment, or other sensitive steps. Call this BEFORE interacting with those fields. After the user presses Continue, you resume from the current page.",
  parameters: z.object({
    reason: z.string().describe("Why the user must take over."),
    instructions: z
      .string()
      .describe(
        'What the user should do, e.g. "Log in, then press Continue."',
      ),
  }),
  needsApproval: true,
  execute: async ({ reason }) => {
    return `The user finished (${reason}). The page is in its current post-user state. Screenshot first, then continue from this exact step. Do not restart the task.`;
  },
});
