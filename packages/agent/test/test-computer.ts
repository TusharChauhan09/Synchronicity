import { writeFileSync } from 'node:fs';
import { PlaywrightComputer } from '../src/index.js';

async function main() {
  const computer = new PlaywrightComputer();
  await computer.launch('https://www.google.com');

  const screenshotBase64 = await computer.screenshot();
  writeFileSync('test-screenshot.png', Buffer.from(screenshotBase64, 'base64'));

  console.log('Screenshot saved as test-screenshot.png — open it to verify.');

  await computer.close();
}

main().catch(console.error);
