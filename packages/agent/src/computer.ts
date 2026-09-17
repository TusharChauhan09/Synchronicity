import { chromium, Browser, BrowserContext, Page } from 'playwright';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { resolve } from 'node:path';
import type { Computer } from '@openai/agents';

type Environment = 'mac' | 'windows' | 'ubuntu' | 'browser';
type Button = 'left' | 'right' | 'wheel' | 'back' | 'forward';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const PROFILE_DIR = resolve(process.cwd(), '.browser-profile');

const BLOCK_PATTERNS = [
  /unusual traffic/i,
  /captcha/i,
  /recaptcha/i,
  /verify you(?:'re| are) human/i,
  /before you continue/i,
];

const KEY_MAP: Record<string, string> = {
  ENTER: 'Enter',
  RETURN: 'Enter',
  ESCAPE: 'Escape',
  BACKSPACE: 'Backspace',
  TAB: 'Tab',
  SPACE: ' ',
  DELETE: 'Delete',
  CTRL: 'Control',
  CONTROL: 'Control',
  ALT: 'Alt',
  SHIFT: 'Shift',
  META: 'Meta',
  CMD: 'Meta',
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
};

function toPlaywrightKey(key: string): string {
  const mapped = KEY_MAP[key.toUpperCase()];
  if (mapped) return mapped;
  if (/^Arrow/.test(key) || ['Enter', 'Backspace', 'Tab', 'Delete', 'Escape'].includes(key)) {
    return key;
  }
  if (key.length === 1) return key;
  return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
}

type LaunchOptions = {
  headless?: boolean;
  useProfile?: boolean;
};

type UserControlHandler = (reason: string) => Promise<void>;

export class PlaywrightComputer implements Computer {
  private browser?: Browser;
  private context!: BrowserContext;
  private page!: Page;
  private userControlHandler?: UserControlHandler;
  private persistent = false;
  private opQueue: Promise<unknown> = Promise.resolve();

  private runOp<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.opQueue.then(fn, fn);
    this.opQueue = next.catch(() => {});
    return next;
  }

  public environment: Environment = 'browser';
  public dimensions: [number, number] = [1280, 800];

  setUserControlHandler(handler: UserControlHandler) {
    this.userControlHandler = handler;
  }

  async launch(startUrl: string = 'https://duckduckgo.com', options: LaunchOptions = {}) {
    const headless = options.headless ?? false;
    const useProfile = options.useProfile ?? !headless;
    const contextOptions = {
      viewport: { width: this.dimensions[0], height: this.dimensions[1] },
      userAgent: USER_AGENT,
    };

    if (useProfile) {
      this.persistent = true;
      this.context = await chromium.launchPersistentContext(PROFILE_DIR, {
        headless,
        ...contextOptions,
      });
      this.page = this.context.pages()[0] ?? (await this.context.newPage());
    } else {
      this.browser = await chromium.launch({ headless });
      this.context = await this.browser.newContext(contextOptions);
      this.page = await this.context.newPage();
    }

    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await this.page.goto(startUrl, { waitUntil: 'domcontentloaded' });
  }

  async close() {
    await this.context.close();
    if (!this.persistent) {
      await this.browser?.close();
    }
  }

  async keepOpen(message = 'Browser left open — press Enter to close.') {
    console.log(`\n${message}`);
    console.log(`Current page: ${this.page.url()}\n`);

    const rl = readline.createInterface({ input, output });
    await rl.question('');
    rl.close();

    await this.close();
  }

  async isBlocked(): Promise<boolean> {
    return this.runOp(async () => {
      const content = await this.page.content();
      return BLOCK_PATTERNS.some((pattern) => pattern.test(content));
    });
  }

  async waitForUserControl(reason: string): Promise<void> {
    if (this.userControlHandler) {
      await this.userControlHandler(reason);
      await this.page.waitForTimeout(500);
      return;
    }

    console.log('\n--- Human control needed ---');
    console.log(reason);

    if (await this.isBlocked()) {
      console.log('Bot detection or CAPTCHA detected — solve it in the browser window.');
    }

    console.log('Press Enter when done to hand control back to the agent...\n');

    const rl = readline.createInterface({ input, output });
    await rl.question('');
    rl.close();

    await this.page.waitForTimeout(500);
  }

  async screenshot(): Promise<string> {
    return this.runOp(async () => {
      const buffer = await this.page.screenshot({ type: 'png' });
      return buffer.toString('base64');
    });
  }

  async click(x: number, y: number, button: Button): Promise<void> {
    return this.runOp(async () => {
      if (button === 'back') {
        await this.page.goBack();
        return;
      }
      if (button === 'forward') {
        await this.page.goForward();
        return;
      }

      const playwrightButton =
        button === 'right' ? 'right' : button === 'wheel' ? 'middle' : 'left';

      await this.page.mouse.click(x, y, { button: playwrightButton });
    });
  }

  async doubleClick(x: number, y: number): Promise<void> {
    return this.runOp(() => this.page.mouse.dblclick(x, y));
  }

  async move(x: number, y: number): Promise<void> {
    return this.runOp(() => this.page.mouse.move(x, y));
  }

  async drag(path: [number, number][]): Promise<void> {
    return this.runOp(async () => {
      const start = path[0];
      if (!start) return;

      const [startX, startY] = start;
      await this.page.mouse.move(startX, startY);
      await this.page.mouse.down();

      for (const [x, y] of path.slice(1)) {
        await this.page.mouse.move(x, y);
      }

      await this.page.mouse.up();
    });
  }

  async type(text: string): Promise<void> {
    return this.runOp(() => this.page.keyboard.type(text));
  }

  async keypress(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    return this.runOp(() =>
      this.page.keyboard.press(keys.map(toPlaywrightKey).join('+')),
    );
  }

  async scroll(x: number, y: number, scrollX: number, scrollY: number): Promise<void> {
    return this.runOp(async () => {
      await this.page.mouse.move(x, y);
      await this.page.mouse.wheel(scrollX, scrollY);
    });
  }

  async wait(): Promise<void> {
    return this.runOp(() => this.page.waitForTimeout(1000));
  }

  async goto(url: string) {
    return this.runOp(() =>
      this.page.goto(url, { waitUntil: 'domcontentloaded' }),
    );
  }

  async getCurrentUrl(): Promise<string> {
    return this.runOp(async () => this.page.url());
  }
}
