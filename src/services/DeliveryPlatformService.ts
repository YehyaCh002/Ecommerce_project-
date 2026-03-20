import { AppDataSource } from '../config/data-source';
import { DeliveryPlatform } from '../entities/DeliveryPlatform';

export class DeliveryPlatformService {
  private platformRepository = AppDataSource.getRepository(DeliveryPlatform);

  async getAllPlatforms(): Promise<DeliveryPlatform[]> {
    return await this.platformRepository.find({
      order: { name: 'ASC' },
    });
  }

  async createPlatform(data: Partial<DeliveryPlatform>): Promise<DeliveryPlatform> {
    const platform = this.platformRepository.create(data);
    return await this.platformRepository.save(platform);
  }

  async getPlatformById(id: string): Promise<DeliveryPlatform | null> {
    return await this.platformRepository.findOne({
      where: { id },
    });
  }

  async updatePlatform(id: string, data: Partial<DeliveryPlatform>): Promise<DeliveryPlatform | null> {
    await this.platformRepository.update(id, data);
    return this.getPlatformById(id);
  }

  async deletePlatform(id: string): Promise<void> {
    await this.platformRepository.delete(id);
  }
}
