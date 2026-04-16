import { Module } from '@nestjs/common';
import { AvitoService } from './avito.service';
import { AvitoGateway } from './avito.gateway';
import { BrowserModule } from '../browser/browser.module';

@Module({
  imports: [BrowserModule],
  providers: [AvitoService, AvitoGateway],
  exports: [AvitoService],
})
export class AvitoModule {}