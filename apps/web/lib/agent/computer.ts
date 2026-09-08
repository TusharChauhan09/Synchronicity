import { chromium, Browser, Page, BrowserContext } from 'playwright';

export class PlaywrightComputer {
  private browser!: Browser;
  private context!: BrowserContext;
  private page!: Page;
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

  async click(x: number, y: number) {
    await this.page.mouse.click(x, y);
  }

  async doubleClick(x: number, y: number) {
    await this.page.mouse.dblclick(x, y);
  }

  async type(text: string) {
    await this.page.keyboard.type(text);
  }

  async scroll(deltaX: number, deltaY: number) {
    await this.page.mouse.wheel(deltaX, deltaY);
  }

  async goto(url: string) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async close() {
    await this.browser.close();
  }
}