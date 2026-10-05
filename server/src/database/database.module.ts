import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './orm-config';
import { ENTITIES } from './entities';
import { DatabaseService } from './database.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildDataSourceOptions({
          host: config.getOrThrow<string>('DB_HOST'),
          port: Number(config.getOrThrow<string>('DB_PORT')),
          username: config.getOrThrow<string>('DB_USERNAME'),
          password: config.getOrThrow<string>('DB_PASSWORD'),
          database: config.getOrThrow<string>('DB_DATABASE'),
        }),
    }),
    TypeOrmModule.forFeature([...ENTITIES]),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
