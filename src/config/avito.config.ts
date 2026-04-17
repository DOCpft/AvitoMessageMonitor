import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AvitoConfig {
  @IsString()
  AVITO_LOGIN!: string;

  @IsString()
  AVITO_PASSWORD!: string;

  @IsString()
  TARGET_NAME!: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  HEADLESS: boolean = true;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(60000)
  @Type(() => Number)
  POLLING_INTERVAL: number = 5000;

  @IsOptional()
  @IsNumber()
  @Min(5000)
  @Max(120000)
  @Type(() => Number)
  NAVIGATION_TIMEOUT: number = 30000;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  MAX_LOGIN_ATTEMPTS: number = 3;

  @IsOptional()
  @IsString()
  USER_AGENT: string = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  @IsOptional()
  @IsNumber()
  @Min(800)
  @Max(3840)
  @Type(() => Number)
  VIEWPORT_WIDTH: number = 1280;

  @IsOptional()
  @IsNumber()
  @Min(600)
  @Max(2160)
  @Type(() => Number)
  VIEWPORT_HEIGHT: number = 800;

  @IsOptional()
  @IsString()
  CORS_ORIGIN: string = 'http://localhost:3000';

  @IsOptional()
  @IsString()
  WS_CORS_ORIGIN: string = 'http://localhost:3000';

  @IsOptional()
  @IsString()
  WS_AUTH_TOKEN?: string;
}

export const validateConfig = (config: Record<string, any>): AvitoConfig => {
  const avitoConfig = new AvitoConfig();
  Object.assign(avitoConfig, config);
  return avitoConfig;
};