import { Module } from '@nestjs/common';
import { AvitoService } from './avito.service';
import { AvitoGateway } from './avito.gateway';
import { BrowserModule } from '../browser/browser.module';
import { AuthService } from './services/auth.service';
import { NavigationService } from './services/navigation.service';
import { MessageService } from './services/message.service';

@Module({
  imports: [BrowserModule],
  providers: [
    AvitoService,
    AvitoGateway,
    AuthService,
    NavigationService,
    MessageService,
  ],
  exports: [AvitoService, AvitoGateway],
})
export class AvitoModule {}