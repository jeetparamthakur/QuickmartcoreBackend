import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureFlagEntity } from './entities/feature-flag.entity';
import {
  FeatureFlagsService,
  FeatureFlagsRepository,
} from './feature-flags.service';
import { FeatureFlagsController } from './feature-flags.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureFlagEntity])],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService, FeatureFlagsRepository],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
