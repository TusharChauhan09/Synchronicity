import { chromium, Browser, Page, BrowserContext } from 'playwright';
import type { Computer } from '@openai/agents';

type Environment = 'mac' | 'windows' | 'ubuntu' | 'browser';
type Button = 'left' | 'right' | 'wheel' | 'back' | 'forward';

export class PlaywrightComputer implements Computer {
  private browser!: Browser;
  private context!: BrowserContext;
  private page!: Page;

  public environment: Environment = 'browser';
  public dimensions: [number, number] = [1280, 800];


  async launch(startUrl: string = 'https://www.google.com') {
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext({
      viewport: { width: this.dimensions[0], height: this.dimensions[1] },
    });
    this.page = await this.context.newPage();
    await this.page.goto(startUrl, { waitUntil: 'domcontentloaded' });
  }

  async screenshot(): Promise<string> {
    const buffer = await this.page.screenshot({ type: 'png' });
    return buffer.toString('base64');
  }

  async click(x: number, y: number, button: Button): Promise<void> {
    const playwrightButton =
      button === 'right' ? 'right' : button === 'wheel' ? 'middle' : 'left';
    await this.page.mouse.click(x, y, { button: playwrightButton });
  }

  async doubleClick(x: number, y: number): Promise<void> {
    await this.page.mouse.dblclick(x, y);
  }

  async move(x: number, y: number): Promise<void> {
    await this.page.mouse.move(x, y);
  }

  async drag(path: [number, number][]): Promise<void> {
    const start = path[0];
    if (!start) return;
    const [startX, startY] = start;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    for (const [x, y] of path.slice(1)) {
      await this.page.mouse.move(x, y);
    }
    await this.page.mouse.up();
  }

  async type(text: string): Promise<void> {
    await this.page.keyboard.type(text);
  }

  async keypress(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.page.keyboard.press(key);
    }
  }

  async scroll(x: number, y: number, scrollX: number, scrollY: number): Promise<void> {
    await this.page.mouse.move(x, y);
    await this.page.mouse.wheel(scrollX, scrollY);
  }

  async wait(): Promise<void> {
    await this.page.waitForTimeout(1000);
  }

  // Extra helpers — not part of the Computer interface, but useful for us
  async goto(url: string) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async close() {
    await this.browser.close();
  }
}