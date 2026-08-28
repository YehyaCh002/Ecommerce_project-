import { Module } from '@nestjs/common';
import { DeliveryPlatformService } from '../services/DeliveryPlatformService';
import { DeliveryPlatformsController } from './delivery-platforms.controller';

@Module({
  controllers: [DeliveryPlatformsController],
  providers: [
    {
      provide: DeliveryPlatformService,
      useFactory: () => new DeliveryPlatformService(),
    },
  ],
})
export class DeliveryPlatformsModule {}
