import { Module, Global } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TenantSequelizeService } from './tenant-sequelize.service';
import { UmzugService } from './umzug.service';

@Global()
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const db = configService.get('database');
        const isDev = configService.get('app.nodeEnv') === 'development';

        const writeHost = {
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
        };
        const readHost = db.readHost
          ? { host: db.readHost, port: db.readPort, username: db.username, password: db.password }
          : null;

        return {
          dialect: 'postgres',
          database: db.database,
          ...(readHost
            ? { replication: { write: writeHost, read: [readHost] } }
            : { host: db.host, port: db.port, username: db.username, password: db.password }),
          autoLoadModels: false,
          synchronize: false,
          logging: isDev ? console.log : false,
          pool: {
            min: 2,
            max: 10,
            acquire: 30000,
            idle: 10000,
            evict: 1000,
          },
          define: {
            underscored: true,
            paranoid: true,
            timestamps: true,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [TenantSequelizeService, UmzugService],
  exports: [TenantSequelizeService, UmzugService],
})
export class DatabaseModule {}
