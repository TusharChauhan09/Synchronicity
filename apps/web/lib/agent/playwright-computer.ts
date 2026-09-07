import { chromium, type Browser, type Page } from "playwright";
import type { Computer } from "@openai/agents";
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "../viewport";

const CUA_KEY_TO_PLAYWRIGHT_KEY: Record<string, string> = {
  "/": "Divide",
  "\\": "Backslash",
  alt: "Alt",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
  arrowup: "ArrowUp",
  backspace: "Backspace",
  capslock: "CapsLock",
  cmd: "Meta",
  ctrl: "Control",
  delete: "Delete",
  end: "End",
  enter: "Enter",
  esc: "Escape",
  home: "Home",
  insert: "Insert",
  option: "Alt",
  pagedown: "PageDown",
  pageup: "PageUp",
  shift: "Shift",
  space: " ",
  super: "Meta",
  tab: "Tab",
  win: "Meta",
};

type MouseButton = "left" | "right" | "wheel" | "back" | "forward";

type Hooks = {
  onScreenshot?: (base64: string) => void;
  onUrl?: (url: string) => void;
};

export class PlaywrightComputer implements Computer {
  environment = "browser" as const;
  dimensions: [number, number] = [VIEWPORT_WIDTH, VIEWPORT_HEIGHT];

  private browser: Browser | null = null;
  private pageRef: Page | null = null;

  constructor(private hooks: Hooks = {}) {}

  private get page(): Page {
    if (!this.pageRef || this.pageRef.isClosed()) {
      throw new Error("Playwright page is not ready.");
    }
    return this.pageRef;
  }

  async init(startUrl: string): Promise<this> {
    const [width, height] = this.dimensions;
    this.browser = await chromium.launch({
      headless: true,
      args: [`--window-size=${width},${height}`],
    });
    this.pageRef = await this.browser.newPage();
    await this.pageRef.setViewportSize({ width, height });
    try {
      await this.pageRef.goto(startUrl, { waitUntil: "domcontentloaded" });
    } catch {
      await this.pageRef.goto("about:blank");
    }
    this.emitUrl();
    return this;
  }

  async dispose(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
    this.pageRef = null;
  }

  private emitUrl(): void {
    if (this.pageRef && !this.pageRef.isClosed()) {
      this.hooks.onUrl?.(this.pageRef.url());
    }
  }

  async captureNow(): Promise<string> {
    const buffer = await this.page.screenshot({ fullPage: false, type: "png" });
    const base64 = Buffer.from(buffer).toString("base64");
    this.hooks.onScreenshot?.(base64);
    this.emitUrl();
    return base64;
  }

  async screenshot(): Promise<string> {
    try {
      await this.page.waitForLoadState("networkidle", { timeout: 3000 });
    } catch {
      try {
        await this.page.waitForLoadState("domcontentloaded", { timeout: 3000 });
      } catch {
        // Keep whatever is currently painted.
      }
    }
    return this.captureNow();
  }

  async click(x: number, y: number, button: MouseButton): Promise<void> {
    const playwrightButton = button === "right" ? "right" : "left";
    await this.page.mouse.click(x, y, { button: playwrightButton });
    this.emitUrl();
  }

  async doubleClick(x: number, y: number): Promise<void> {
    await this.page.mouse.dblclick(x, y);
    this.emitUrl();
  }

  async scroll(
    x: number,
    y: number,
    scrollX: number,
    scrollY: number,
  ): Promise<void> {
    await this.page.mouse.move(x, y);
    await this.page.mouse.wheel(scrollX, scrollY);
    this.emitUrl();
  }

  async type(text: string): Promise<void> {
    await this.page.keyboard.type(text);
  }

  async wait(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  async move(x: number, y: number): Promise<void> {
    await this.page.mouse.move(x, y);
  }

  async keypress(keys: string[]): Promise<void> {
    const mapped = keys.map(
      (key) => CUA_KEY_TO_PLAYWRIGHT_KEY[key.toLowerCase()] ?? key,
    );
    for (const key of mapped) {
      await this.page.keyboard.down(key);
    }
    for (const key of [...mapped].reverse()) {
      await this.page.keyboard.up(key);
    }
  }

  async drag(path: [number, number][]): Promise<void> {
    const start = path[0];
    if (!start) {
      return;
    }
    await this.page.mouse.move(start[0], start[1]);
    await this.page.mouse.down();
    for (const point of path.slice(1)) {
      await this.page.mouse.move(point[0], point[1]);
    }
    await this.page.mouse.up();
    this.emitUrl();
  }
}
