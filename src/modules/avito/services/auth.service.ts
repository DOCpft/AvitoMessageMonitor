import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrowserService } from '../../browser/browser.service';
import { Page } from 'puppeteer';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private loginAttempts = 0;

  constructor(
    private browserService: BrowserService,
    private configService: ConfigService,
  ) {}

  /**
   * Ensure user is logged in to Avito
   * @param page Puppeteer page
   * @returns true if logged in successfully
   */
  async ensureLoggedIn(page: Page): Promise<boolean> {
    try {
      // Check if we are already logged in
      await page.goto('https://www.avito.ru/profile/messenger', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // If URL contains /auth, we are not logged in
      if (page.url().includes('#login')) {
        this.logger.log('Not logged in, performing login...');
        return await this.performLogin(page);
      }

      this.logger.log('Already logged in');
      return true;
    } catch (error) {
      this.logger.error('Error checking login status', error);
      return false;
    }
  }

  /**
   * Perform login with credentials from environment
   * @param page Puppeteer page
   * @returns true if login successful
   */
  private async performLogin(page: Page): Promise<boolean> {
    const login = this.configService.getOrThrow<string>('AVITO_LOGIN');
    const password = this.configService.getOrThrow<string>('AVITO_PASSWORD');
    const maxLoginAttempts = parseInt(
      this.configService.get('MAX_LOGIN_ATTEMPTS', '3'),
    );

    if (this.loginAttempts >= maxLoginAttempts) {
      this.logger.error('Max login attempts reached');
      return false;
    }

    try {
      this.loginAttempts++;
      await page.goto('https://www.avito.ru/#login', {
        waitUntil: 'domcontentloaded',
      });

      // Click login button if present
      await page
        .waitForSelector('[data-marker="login-button"]', { timeout: 5000 })
        .catch(() => null);
      const loginButton = await page.$('[data-marker="login-button"]');
      if (loginButton) {
        await loginButton.click();
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
      }

      // Fill login form
      await page.waitForSelector('input[name="login"]', { timeout: 10000 });
      await page.type('input[name="login"]', login);
      await page.type('input[name="password"]', password);

      // Submit form
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      ]);

      // Verify login success
      await page.waitForSelector('[data-marker="header-user-menu"]', {
        timeout: 10000,
      });
      this.logger.log('Login successful');

      // Save cookies for future sessions
      await this.browserService.saveCookies(page);
      this.loginAttempts = 0; // Reset attempts on success
      return true;
    } catch (error) {
      this.logger.error(`Login attempt ${this.loginAttempts} failed`, error);
      return false;
    }
  }

  /**
   * Check if user is logged in (quick check)
   * @param page Puppeteer page
   * @returns boolean
   */
  async isLoggedIn(page: Page): Promise<boolean> {
    try {
      await page.goto('https://www.avito.ru/profile/messenger', {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
      return !page.url().includes('/auth');
    } catch {
      return false;
    }
  }
}