import { Module } from '@nestjs/common';
import { BrowserService } from './browser.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [BrowserService]
})
export class BrowserModule {}
