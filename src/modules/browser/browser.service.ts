import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as puppeteer from 'puppeteer';
import { Browser, Page, LaunchOptions } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface BrowserConfig {
  headless: boolean;
  userAgent?: string;
  viewport: { width: number; height: number };
  args: string[];
  cookiesPath: string;
  maxRetries: number;
  retryDelay: number;
}

@Injectable()
export class BrowserService implements OnModuleDestroy {
  private readonly logger = new Logger(BrowserService.name);
  private browser: Browser | null = null;
  private page: Page | null = null;
  private readonly config: BrowserConfig;

  constructor(private configService: ConfigService) {
    this.config = this.loadConfig();
  }

  private loadConfig(): BrowserConfig {
    const headless = this.configService.get('HEADLESS', 'true') === 'true';
    const userAgent = this.configService.get(
      'USER_AGENT',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    const cookiesPath = path.join(process.cwd(), 'cookies.json');
    const viewport = {
      width: parseInt(this.configService.get('VIEWPORT_WIDTH', '1280')),
      height: parseInt(this.configService.get('VIEWPORT_HEIGHT', '800')),
    };

    return {
      headless,
      userAgent,
      viewport,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      cookiesPath,
      maxRetries: 3,
      retryDelay: 1000,
    };
  }

  async getPage(): Promise<Page> {
    if (this.page && !this.page.isClosed() && this.browser) {
      return this.page;
    }

    await this.launchBrowserWithRetry();
    if (!this.browser) {
      throw new Error('Failed to launch browser after retries');
    }

    this.page = await this.browser.newPage();
    await this.page.setViewport(this.config.viewport);
    if (this.config.userAgent) {
      await this.page.setUserAgent(this.config.userAgent);
    }

    await this.loadCookies(this.page);
    return this.page;
  }

  private async launchBrowserWithRetry(): Promise<void> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.logger.log(`Launching browser (attempt ${attempt}/${this.config.maxRetries})`);
        const launchOptions: LaunchOptions = {
          headless: this.config.headless,
          args: this.config.args,
        };
        this.browser = await puppeteer.launch(launchOptions);
        this.logger.log('Browser launched successfully');
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Browser launch failed: ${lastError.message}`);
        if (attempt < this.config.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }
    throw lastError || new Error('Browser launch failed');
  }

  private async loadCookies(page: Page): Promise<void> {
    try {
      const cookiesString = await fs.readFile(this.config.cookiesPath, 'utf-8');
      const cookies = JSON.parse(cookiesString);
      if (Array.isArray(cookies) && cookies.length > 0) {
        await page.setCookie(...cookies);
        this.logger.log(`Loaded ${cookies.length} cookies from file`);
      }
    } catch (error) {
      // Файл не существует или повреждён - это нормально
      this.logger.debug('No cookies file found or file is invalid');
    }
  }

  async saveCookies(page: Page): Promise<void> {
    try {
      const cookies = await page.cookies();
      await fs.writeFile(this.config.cookiesPath, JSON.stringify(cookies, null, 2));
      this.logger.log(`Saved ${cookies.length} cookies to file`);
    } catch (error) {
      this.logger.error('Failed to save cookies', error);
      throw error;
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.logger.log('Browser closed');
      } catch (error) {
        this.logger.error('Error while closing browser', error);
      } finally {
        this.browser = null;
        this.page = null;
      }
    }
  }

  async onModuleDestroy() {
    await this.closeBrowser();
  }

  async isBrowserAlive(): Promise<boolean> {
    return this.browser?.isConnected() || false;
  }

  async restartBrowser(): Promise<void> {
    await this.closeBrowser();
    await this.launchBrowserWithRetry();
    if (this.browser) {
      this.page = await this.browser.newPage();
      await this.page.setViewport(this.config.viewport);
      await this.loadCookies(this.page);
    }
  }
}