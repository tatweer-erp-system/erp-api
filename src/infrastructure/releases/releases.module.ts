import { Module, Global } from '@nestjs/common';
import { ReleasesService } from './releases.service';
import { PublicReleasesController, AdminReleasesController } from './releases.controller';

@Global()
@Module({
  controllers: [PublicReleasesController, AdminReleasesController],
  providers: [ReleasesService],
  exports: [ReleasesService],
})
export class ReleasesModule {}
