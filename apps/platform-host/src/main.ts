import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  AGENTFORGE_APPLICATION_HOST,
  FoundationModule,
} from '@agentforge/foundation';
import type { ApplicationHost } from '@agentforge/foundation';

export async function bootstrap(): Promise<void> {
  const context = await NestFactory.createApplicationContext(FoundationModule, { logger: false });
  const host = context.get<ApplicationHost>(AGENTFORGE_APPLICATION_HOST);
  await host.start();
  await host.stop();
  await context.close();
}

if (process.env['AGENTFORGE_RUN_HOST'] === '1') await bootstrap();
