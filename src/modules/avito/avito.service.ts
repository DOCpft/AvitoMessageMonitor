import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrowserService } from '../browser/browser.service';
import { Page } from 'puppeteer';
import { AvitoMessage } from '../common/interfaces/message.interface';
import { AvitoGateway } from './avito.gateway';
import { AuthService } from './services/auth.service';
import { NavigationService } from './services/navigation.service';
import { MessageService } from './services/message.service';

export interface AvitoConfig {
  targetName: string;
  login: string;
  password: string;
  pollingInterval: number;
  navigationTimeout: number;
  maxLoginAttempts: number;
}

@Injectable()
export class AvitoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AvitoService.name);
  private monitoring = false;
  private knownMessageIds = new Set<string>();
  private page: Page | null = null;
  private readonly config: AvitoConfig;

  constructor(
    private browserService: BrowserService,
    private configService: ConfigService,
    private gateway: AvitoGateway,
    private authService: AuthService,
    private navigationService: NavigationService,
    private messageService: MessageService,
  ) {
    this.config = this.loadConfig();
  }

  private loadConfig(): AvitoConfig {
    const targetName = this.configService.getOrThrow<string>('TARGET_NAME');
    const login = this.configService.getOrThrow<string>('AVITO_LOGIN');
    const password = this.configService.getOrThrow<string>('AVITO_PASSWORD');
    const pollingInterval = parseInt(this.configService.get('POLLING_INTERVAL', '5000'));
    const navigationTimeout = parseInt(this.configService.get('NAVIGATION_TIMEOUT', '30000'));
    const maxLoginAttempts = parseInt(this.configService.get('MAX_LOGIN_ATTEMPTS', '3'));

    return {
      targetName,
      login,
      password,
      pollingInterval,
      navigationTimeout,
      maxLoginAttempts,
    };
  }

  async onModuleInit() {
    // Temporarily disabled for debugging
    await this.startMonitoring();
    this.logger.log('Monitoring is running');
  }

  async startMonitoring(): Promise<void> {
    if (this.monitoring) return;
    this.monitoring = true;

    this.logger.log('Starting Avito message monitoring');

    try {
      this.page = await this.browserService.getPage();

      // Use AuthService for authentication
      const loggedIn = await this.authService.ensureLoggedIn(this.page);
      if (!loggedIn) {
        this.logger.error('Cannot monitor: login failed');
        this.monitoring = false;
        return;
      }

      // Use NavigationService for navigation
      await this.navigationService.navigateToMessenger(this.page);
      const chatOpened = await this.navigationService.openTargetChat(this.page);
      if (!chatOpened) {
        this.logger.error('Cannot monitor: target chat not found');
        this.monitoring = false;
        return;
      }

      // Use MessageService to extract initial messages
      const initialMessages = await this.messageService.extractMessages(this.page);
      initialMessages.forEach(msg => this.knownMessageIds.add(msg.id));

      // Start monitoring loop
      while (this.monitoring) {
        // Use setTimeout instead of deprecated waitForTimeout
        await new Promise(resolve => setTimeout(resolve, this.config.pollingInterval));

        try {
          const currentMessages = await this.messageService.extractMessages(this.page);
          for (const msg of currentMessages) {
            if (!this.knownMessageIds.has(msg.id)) {
              this.knownMessageIds.add(msg.id);
              this.logger.log(`New message from ${msg.sender}: ${msg.text}`);
              // Send via WebSocket
              this.gateway.sendNewMessage(msg);
            }
          }
        } catch (error) {
          this.logger.error('Error during message polling', error);
        }
      }
    } catch (err) {
      this.logger.error('Monitoring loop crashed', err);
      this.monitoring = false;
    }
  }

  stopMonitoring(): void {
    this.monitoring = false;
  }

  async onModuleDestroy() {
    this.stopMonitoring();
    if (this.page) {
      try {
        await this.browserService.closeBrowser();
      } catch (error) {
        this.logger.error('Error closing browser on module destroy', error);
      }
    }
  }
}