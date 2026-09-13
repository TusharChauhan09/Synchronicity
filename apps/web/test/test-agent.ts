import './load-env';
import { run } from '@openai/agents';
import { PlaywrightComputer } from '../lib/agent/computer';
import { createBrowserAgent } from '../lib/agent/agent';

async function main() {
  const computer = new PlaywrightComputer();
  await computer.launch('https://duckduckgo.com');

  const agent = createBrowserAgent(computer);

  console.log('Running agent with task: "Search for OpenAI Agents SDK"');
  console.log('If a CAPTCHA appears, solve it in the browser and press Enter in the terminal.\n');

  const result = await run(
    agent,
    'Search for "OpenAI Agents SDK" and tell me the title of the first result.',
  );

  console.log('--- Agent finished ---');
  console.log(result.finalOutput);

  await computer.close();
}

main().catch(console.error);