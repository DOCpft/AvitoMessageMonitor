import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Page } from 'puppeteer';

@Injectable()
export class NavigationService {
  private readonly logger = new Logger(NavigationService.name);
  private readonly targetName: string;
  private readonly navigationTimeout: number;

  constructor(private configService: ConfigService) {
    this.targetName = this.configService.getOrThrow<string>('TARGET_NAME');
    this.navigationTimeout = parseInt(
      this.configService.get('NAVIGATION_TIMEOUT', '30000'),
    );
  }

  /**
   * Navigate to Avito messenger page
   * @param page Puppeteer page
   */
  async navigateToMessenger(page: Page): Promise<void> {
    try {
      await page.goto('https://www.avito.ru/profile/messenger', {
        waitUntil: 'domcontentloaded',
        timeout: this.navigationTimeout,
      });
      // Wait for dialogs list to load
      await page.waitForSelector('[data-marker="channels/channel"]', {
        timeout: 10000,
      });
      
      this.logger.log('Navigated to messenger successfully');
    } catch (error) {
      this.logger.error('Failed to navigate to messenger', error);
      throw error;
    }
  }

  /**
   * Open chat with target user
   * @param page Puppeteer page
   * @returns true if chat opened successfully
   */
  async openTargetChat(page: Page): Promise<boolean> {
    try {
      // Find all chat items
      const chats = await page.$$('[data-marker="inbox-item"]');
      for (const chat of chats) {
        const nameElement = await chat.$('[data-marker="inbox-item-title"]');
        if (!nameElement) continue;

        const name = await page.evaluate(
          (el) => el.textContent?.trim() ?? '',
          nameElement,
        );
        if (name.includes(this.targetName)) {
          await chat.click();
          await page.waitForSelector('[data-marker="chat-messages-wrapper"]', {
            timeout: 5000,
          });
          this.logger.log(`Opened chat with ${name}`);
          return true;
        }
      }
      this.logger.warn(`Chat with ${this.targetName} not found`);
      return false;
    } catch (error) {
      this.logger.error('Error opening target chat', error);
      return false;
    }
  }

  /**
   * Refresh the current page
   * @param page Puppeteer page
   */
  async refreshPage(page: Page): Promise<void> {
    try {
      await page.reload({ waitUntil: 'domcontentloaded' });
      this.logger.debug('Page refreshed');
    } catch (error) {
      this.logger.error('Failed to refresh page', error);
    }
  }

  /**
   * Check if messenger page is loaded
   * @param page Puppeteer page
   * @returns boolean
   */
  async isMessengerLoaded(page: Page): Promise<boolean> {
    try {
      await page.waitForSelector('[data-marker="inbox-item"]', {
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }
}