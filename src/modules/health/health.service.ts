import { Injectable, Logger } from '@nestjs/common';
import { BrowserService } from '../browser/browser.service';
import { AvitoGateway } from '../avito/avito.gateway';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  checks: {
    browser: {
      status: 'up' | 'down';
      message?: string;
    };
    websocket: {
      status: 'up' | 'down';
      clients: number;
    };
    memory: {
      used: number;
      total: number;
      unit: 'MB';
    };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private browserService: BrowserService,
    private gateway: AvitoGateway,
  ) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const checks = {
      browser: await this.checkBrowser(),
      websocket: this.checkWebSocket(),
      memory: this.checkMemory(),
    };

    const overallStatus = this.determineOverallStatus(checks);
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private async checkBrowser(): Promise<{
    status: 'up' | 'down';
    message?: string;
  }> {
    try {
      const isAlive = await this.browserService.isBrowserAlive();
      return {
        status: isAlive ? 'up' : 'down',
        message: isAlive ? 'Browser is connected' : 'Browser is not connected',
      };
    } catch (error) {
      this.logger.error('Browser health check failed', error);
      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private checkWebSocket(): {
    status: 'up' | 'down';
    clients: number;
  } {
    try {
      const clients = this.gateway.getConnectedClientsCount();
      return {
        status: clients >= 0 ? 'up' : 'down',
        clients,
      };
    } catch (error) {
      this.logger.error('WebSocket health check failed', error);
      return {
        status: 'down',
        clients: 0,
      };
    }
  }

  private checkMemory(): {
    used: number;
    total: number;
    unit: 'MB';
  } {
    const used = process.memoryUsage();
    const usedMB = Math.round(used.heapUsed / 1024 / 1024);
    const totalMB = Math.round(used.heapTotal / 1024 / 1024);
    return {
      used: usedMB,
      total: totalMB,
      unit: 'MB',
    };
  }

  private determineOverallStatus(checks: HealthStatus['checks']): 'ok' | 'degraded' | 'error' {
    const { browser, websocket } = checks;
    if (browser.status === 'down') {
      return 'error';
    }
    if (websocket.status === 'down') {
      return 'degraded';
    }
    return 'ok';
  }
}