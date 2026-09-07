import { Agent, computerTool } from "@openai/agents";
import type { PlaywrightComputer } from "./playwright-computer";
import { requestUserControlTool } from "./tools";

const INSTRUCTIONS = `You are Synchronicity, a browser automation agent.

You drive a real browser with the computer tool: screenshot, click(x,y), double click, scroll, type, keypress, move, wait, drag. Prefer screenshots and coordinates. Do not guess CSS selectors.

Loop: screenshot → smallest useful action → screenshot again → repeat until the user's goal is done, then summarize.

Human-in-the-loop: if the page needs login, signup, 2FA, captcha, payment, or credentials, call request_user_control BEFORE touching those fields. After control returns, continue from the CURRENT page. Never restart the whole task.

Stay on the requested task.`;

export function createBrowserAgent(computer: PlaywrightComputer) {
  return new Agent({
    name: "Synchronicity Browser Agent",
    model: process.env.OPENAI_MODEL ?? "gpt-5.4",
    instructions: INSTRUCTIONS,
    tools: [computerTool({ computer }), requestUserControlTool],
  });
}
