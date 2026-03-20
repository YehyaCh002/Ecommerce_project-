import { FastifyRequest, FastifyReply } from 'fastify';
import { DeliveryPlatformService } from '../services/DeliveryPlatformService';
import { DeliveryPlatform } from '../entities/DeliveryPlatform';

export class DeliveryPlatformController {
  private platformService = new DeliveryPlatformService();

  getAllPlatforms = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const platforms = await this.platformService.getAllPlatforms();
      res.status(200).send({
        success: true,
        data: platforms,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  };

  createPlatform = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const body = req.body as Partial<DeliveryPlatform>;
      if (!body.name) {
        res.status(400).send({
          success: false,
          message: 'Platform name is required',
        });
        return;
      }
      const platform = await this.platformService.createPlatform(body);
      res.status(201).send({
        success: true,
        data: platform,
      });
    } catch (error) {
      res.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create platform',
      });
    }
  };

  updatePlatform = async (
    req: FastifyRequest,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as Partial<DeliveryPlatform>;
      const platform = await this.platformService.updatePlatform(id, body);
      if (!platform) {
        res.status(404).send({
          success: false,
          message: 'Platform not found',
        });
        return;
      }
      res.status(200).send({
        success: true,
        data: platform,
      });
    } catch (error) {
      res.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update platform',
      });
    }
  };
}
