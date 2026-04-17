import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Page } from 'puppeteer';
import { AvitoMessage } from '../../common/interfaces/message.interface';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);
  private readonly targetName: string;
  private knownMessageIds = new Set<string>();

  constructor(private configService: ConfigService) {
    this.targetName = this.configService.getOrThrow<string>('TARGET_NAME');
  }

  /**
   * Extract messages from current chat page
   * @param page Puppeteer page
   * @returns Array of messages from target sender
   */
  async extractMessages(page: Page): Promise<AvitoMessage[]> {
    try {
      const messages = await page.$$eval(
        '[data-marker="chat-message"]',
        (elements) => {
          return elements.map((el) => {
            const id = el.getAttribute('data-message-id') || '';
            const senderEl = el.querySelector(
              '[data-marker="chat-message-author"]',
            );
            const textEl = el.querySelector('[data-marker="chat-message-text"]');
            const timeEl = el.querySelector('[data-marker="chat-message-time"]');

            const sender = senderEl ? senderEl.textContent?.trim() || '' : '';
            const text = textEl ? textEl.textContent?.trim() || '' : '';
            const timeAttr = timeEl ? timeEl.getAttribute('datetime') : null;
            const timestamp = timeAttr ? new Date(timeAttr) : new Date();

            return { id, sender, text, timestamp };
          });
        },
      );

      // Filter only messages from target sender
      return messages.filter((msg) => msg.sender.includes(this.targetName));
    } catch (error) {
      this.logger.error('Error extracting messages', error);
      return [];
    }
  }

  /**
   * Get new messages (not in knownMessageIds)
   * @param page Puppeteer page
   * @returns Array of new messages
   */
  async getNewMessages(page: Page): Promise<AvitoMessage[]> {
    const allMessages = await this.extractMessages(page);
    const newMessages = allMessages.filter(
      (msg) => !this.knownMessageIds.has(msg.id),
    );
    return newMessages;
  }

  /**
   * Mark messages as known
   * @param messages Array of messages
   */
  markMessagesAsKnown(messages: AvitoMessage[]): void {
    messages.forEach((msg) => this.knownMessageIds.add(msg.id));
  }

  /**
   * Clear known messages cache
   */
  clearKnownMessages(): void {
    this.knownMessageIds.clear();
    this.logger.debug('Cleared known messages cache');
  }

  /**
   * Get count of known messages
   */
  getKnownMessagesCount(): number {
    return this.knownMessageIds.size;
  }

  /**
   * Check if message is known
   * @param messageId Message ID
   */
  isMessageKnown(messageId: string): boolean {
    return this.knownMessageIds.has(messageId);
  }

  /**
   * Wait for new messages with timeout
   * @param page Puppeteer page
   * @param timeoutMs Timeout in milliseconds
   * @returns Array of new messages or empty array
   */
  async waitForNewMessages(
    page: Page,
    timeoutMs = 10000,
  ): Promise<AvitoMessage[]> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const newMessages = await this.getNewMessages(page);
      if (newMessages.length > 0) {
        return newMessages;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return [];
  }
}