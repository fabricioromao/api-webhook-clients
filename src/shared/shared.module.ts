import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import basicAuth from 'express-basic-auth';
import {
  EnvSchemaType,
  envValidationSchema,
} from './environment/environment.schema';
import { ResponseHandlerService, StorageUploadUtilsService } from './service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validationSchema: envValidationSchema,
      cache: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow('DATABASE_URL'),
        onConnectionCreate: (connection) => {
          connection.on(
            'error',
            console.error.bind(console, 'connection error:'),
          );
          connection.once('open', () => console.log('Connected to MongoDB'));
        },
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: '5m' },
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvSchemaType>) => ({
        connection: {
          host: configService.getOrThrow('REDIS_HOST'),
          port: configService.getOrThrow('REDIS_PORT'),
          password: configService.getOrThrow('REDIS_PASSWORD'),
        },
      }),
    }),
    BullBoardModule.forRootAsync({
      imports: [BullModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvSchemaType>) => ({
        route: '/queues',
        adapter: ExpressAdapter,
        boardOptions: {
          uiConfig: {
            boardTitle: 'Webhook Queues',
          },
        },
        middleware: basicAuth({
          challenge: true,
          users: {
            admin: configService.getOrThrow('BULL_BOARD_PASSWORD'),
          },
        }),
      }),
    }),
  ],
  providers: [ResponseHandlerService, StorageUploadUtilsService],
  exports: [ConfigModule, ResponseHandlerService, StorageUploadUtilsService],
})
export class SharedModule {}
