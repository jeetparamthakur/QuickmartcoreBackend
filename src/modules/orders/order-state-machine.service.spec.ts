import { Test, TestingModule } from '@nestjs/testing';
import { OrderStateMachineService } from './order-state-machine.service';
import { SubOrderStatus } from '../../common/enums';
import { BadRequestException } from '@nestjs/common';

describe('OrderStateMachineService', () => {
  let service: OrderStateMachineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderStateMachineService],
    }).compile();

    service = module.get(OrderStateMachineService);
  });

  it('allows PLACED -> ACCEPTED', () => {
    expect(() =>
      service.assertTransition(SubOrderStatus.PLACED, SubOrderStatus.ACCEPTED),
    ).not.toThrow();
  });

  it('rejects PLACED -> DELIVERED', () => {
    expect(() =>
      service.assertTransition(SubOrderStatus.PLACED, SubOrderStatus.DELIVERED),
    ).toThrow(BadRequestException);
  });

  it('canCancel returns true for PLACED', () => {
    expect(service.canCancel(SubOrderStatus.PLACED)).toBe(true);
  });

  it('canCancel returns false for DELIVERED', () => {
    expect(service.canCancel(SubOrderStatus.DELIVERED)).toBe(false);
  });
});
