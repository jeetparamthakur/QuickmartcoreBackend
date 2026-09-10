jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
  InjectDataSource: () => () => undefined,
}));

import { ConflictException } from '@nestjs/common';
import { InventoryRepository, InventoryService } from './inventory.service';
import { InventoryStatus } from '../../common/enums';

type MockManager = {
  getRepository: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
};

describe('InventoryService', () => {
  it('throws INSUFFICIENT_STOCK when not enough available quantity', async () => {
    const mockManager: MockManager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({
            quantityAvailable: 5,
            quantityReserved: 4,
            sellerProductId: 'prod-1',
          }),
        }),
      }),
      save: jest.fn(),
      create: jest.fn(),
    };

    const dataSource = {
      transaction: jest.fn((cb: (manager: MockManager) => unknown) =>
        cb(mockManager),
      ),
    };

    const repo = new InventoryRepository(
      {} as never,
      {} as never,
      dataSource as never,
    );
    const service = new InventoryService(repo);

    await expect(
      service.reserve('order-1', [{ sellerProductId: 'prod-1', quantity: 2 }]),
    ).rejects.toThrow(ConflictException);
  });

  it('reserves inventory when stock is available', async () => {
    const inventory = {
      quantityAvailable: 10,
      quantityReserved: 0,
      status: InventoryStatus.AVAILABLE,
      sellerProductId: 'prod-1',
    };

    const mockManager: MockManager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ ...inventory }),
        }),
      }),
      save: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(
        (_entity: unknown, data: Record<string, unknown>) => data,
      ),
    };

    const dataSource = {
      transaction: jest.fn((cb: (manager: MockManager) => unknown) =>
        cb(mockManager),
      ),
    };

    const repo = new InventoryRepository(
      {} as never,
      {} as never,
      dataSource as never,
    );
    const service = new InventoryService(repo);

    await expect(
      service.reserve('order-1', [{ sellerProductId: 'prod-1', quantity: 2 }]),
    ).resolves.toBeUndefined();

    expect(mockManager.save).toHaveBeenCalled();
    const savedInventory = (
      mockManager.save.mock.calls as Array<[Record<string, unknown>?]>
    ).find((call) => call[0]?.quantityReserved === 2);
    expect(savedInventory).toBeDefined();
  });
});
