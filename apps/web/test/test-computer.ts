import { PlaywrightComputer } from '../lib/agent/computer';
import { writeFileSync } from 'fs';

async function main() {
  const computer = new PlaywrightComputer();
  await computer.launch('https://www.google.com');

  const screenshotBase64 = await computer.screenshot();
  writeFileSync('test-screenshot.png', Buffer.from(screenshotBase64, 'base64'));

  console.log('Screenshot saved as test-screenshot.png — open it to verify.');

  await computer.close();
}

main().catch(console.error);