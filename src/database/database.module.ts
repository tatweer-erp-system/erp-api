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
        return {
          dialect: 'postgres',
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          autoLoadModels: false,
          synchronize: false,
          logging: configService.get('app.nodeEnv') === 'development' ? console.log : false,
          pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
          define: { underscored: true, paranoid: true, timestamps: true },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [TenantSequelizeService, UmzugService],
  exports: [TenantSequelizeService, UmzugService],
})
export class DatabaseModule {}
