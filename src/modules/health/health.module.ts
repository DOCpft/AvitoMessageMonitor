import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { BrowserModule } from '../browser/browser.module';
import { AvitoModule } from '../avito/avito.module';

@Module({
  imports: [BrowserModule, AvitoModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}