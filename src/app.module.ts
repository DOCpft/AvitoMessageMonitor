import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AvitoModule } from './modules/avito/avito.module';
import { BrowserModule } from './modules/browser/browser.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BrowserModule,
    AvitoModule,
    HealthModule
  ],
})
export class AppModule {}