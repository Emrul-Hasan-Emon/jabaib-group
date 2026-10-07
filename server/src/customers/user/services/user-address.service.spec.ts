import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserAddressService } from './user-address.service';
import { DatabaseService } from '../../../database/database.service';

function address(partial: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 7,
    recipientName: 'Rafi',
    phone: '01700000001',
    address: 'House 12, Dhanmondi',
    divisionId: 1,
    districtId: 1,
    zipCode: '1205',
    type: 'shipping',
    isDefault: false,
    ...partial,
  };
}

describe('UserAddressService (customer address book)', () => {
  let service: UserAddressService;
  let db: {
    address: {
      find: jest.Mock;
      findOne: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
      softRemove: jest.Mock;
    };
  };

  beforeEach(async () => {
    db = {
      address: {
        find: jest.fn(async () => []),
        findOne: jest.fn(async () => null),
        create: jest.fn((row) => ({ ...row })),
        save: jest.fn((row) => Promise.resolve(row)),
        softRemove: jest.fn((row) => Promise.resolve(row)),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        UserAddressService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get(UserAddressService);
  });

  it('lists only the caller’s addresses with default first', async () => {
    await service.list(7);
    expect(db.address.find.mock.calls[0][0].where.userId).toBe(7);
    expect(db.address.find.mock.calls[0][0].order).toEqual({
      isDefault: 'DESC',
      id: 'DESC',
    });
  });

  it('creates an address stamped to the caller', async () => {
    db.address.findOne.mockResolvedValueOnce(
      address({ id: 2, userId: 7, isDefault: true }),
    );
    const dto = {
      recipientName: 'Rafi',
      phone: '01700000001',
      address: 'House 12, Dhanmondi',
      isDefault: true,
    };
    const result = await service.create(7, dto);
    expect(db.address.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        creatorType: 'user',
        isDefault: true,
      }),
    );
    expect(result.id).toBe(2);
  });

  it('makes a new default clear the previous default', async () => {
    db.address.find.mockResolvedValueOnce([
      address({ id: 1, userId: 7, isDefault: true }),
    ]);
    db.address.findOne
      .mockResolvedValueOnce(address({ id: 10, userId: 7, isDefault: false })) // requireOwned for update
      .mockResolvedValueOnce(address({ id: 10, userId: 7, isDefault: true })); // findOne for return
    const result = await service.update(7, 10, { isDefault: true });
    expect(result.isDefault).toBe(true);
    // the previous default was cleared via save
    expect(db.address.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, isDefault: false }),
    );
  });

  it('rejects mutation of another user’s address (404)', async () => {
    db.address.findOne.mockResolvedValue(null);
    await expect(service.update(7, 99, { address: 'hacked' })).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.remove(7, 99)).rejects.toThrow(NotFoundException);
    await expect(service.setDefault(7, 99)).rejects.toThrow(NotFoundException);
  });

  it('deletes via soft remove', async () => {
    db.address.findOne.mockResolvedValue(address({ id: 5, userId: 7 }));
    const result = await service.remove(7, 5);
    expect(result).toEqual({ deleted: true });
    expect(db.address.softRemove).toHaveBeenCalled();
  });
});
