import { Test, TestingModule } from '@nestjs/testing';
import { LivenessController } from './liveness.controller';

describe('LivenessController', () => {
  let controller: LivenessController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LivenessController],
    }).compile();

    controller = module.get<LivenessController>(LivenessController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return status ok on /healthz', () => {
    const result = controller.liveness();
    expect(result).toEqual({ status: 'ok' });
  });
});
