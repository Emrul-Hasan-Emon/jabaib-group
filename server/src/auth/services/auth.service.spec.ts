import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { DatabaseService } from '../../database/database.service';
import { JwtManagerService } from '../jwt/jwt-manager.service';
import type { JwtPayload } from '../jwt/jwt-payload';

const userCtx: JwtPayload = {
  id: 7,
  sub: 'customer@jabaib.test',
  type: 'user',
  role: null,
  userName: 'Customer One',
};

describe('AuthService (customer register/profile/password)', () => {
  let service: AuthService;
  let db: {
    user: {
      find: jest.Mock;
      findOne: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
    };
  };
  const jwtManager = {
    createAccessToken: jest.fn(() => 'access'),
    createRefreshToken: jest.fn(async () => 'refresh'),
    verifyRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
  };

  beforeEach(async () => {
    db = {
      user: {
        find: jest.fn(async () => []),
        findOne: jest.fn(async () => null),
        create: jest.fn((row) => ({ ...row })),
        save: jest.fn((row) => Promise.resolve(row)),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseService, useValue: db },
        { provide: JwtManagerService, useValue: jwtManager },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  describe('register', () => {
    it('creates the user with hashed password and issues tokens', async () => {
      db.user.findOne.mockResolvedValue(null);
      const result = await service.register({
        name: 'Rafi',
        email: 'rafi@jabaib.test',
        phone: '01700000001',
        password: 'Secret@123',
      });

      expect(db.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Rafi', email: 'rafi@jabaib.test' }),
      );
      const created = db.user.create.mock.calls[0][0];
      expect(created.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash
      expect(result.accessToken).toBe('access');
      expect(result.refreshToken).toBe('refresh');
    });

    it('rejects a registration without email or phone (400)', async () => {
      await expect(
        service.register({ name: 'Anonymous', password: 'Secret@123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when the email is already registered (400)', async () => {
      db.user.find.mockResolvedValue([{ id: 3, email: 'rafi@jabaib.test' }]);
      await expect(
        service.register({
          name: 'Rafi',
          email: 'rafi@jabaib.test',
          password: 'Secret@123',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(db.user.save).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('updates name and phone, keeping the user reachable', async () => {
      const existing = {
        id: 7,
        name: 'Old Name',
        email: 'customer@jabaib.test',
        phone: '01700000009',
        isActive: true,
      };
      db.user.findOne.mockResolvedValue(existing);
      db.user.findOne.mockResolvedValueOnce(existing);

      const result = await service.updateProfile(userCtx, {
        name: 'New Name',
        phone: '01800000009',
      });

      expect(result).toBeDefined();
      expect(existing.name).toBe('New Name');
      expect(existing.phone).toBe('01800000009');
    });

    it('rejects a phone already used by another user (400)', async () => {
      db.user.findOne
        .mockResolvedValueOnce({
          id: 7,
          name: 'Me',
          phone: '01700000009',
          isActive: true,
        }) // the caller
        .mockResolvedValueOnce({ id: 99, phone: '01800000009' }); // the clash
      await expect(
        service.updateProfile(userCtx, { phone: '01800000009' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changePassword', () => {
    it('rejects a wrong current password (400)', async () => {
      const bcrypt = jest.requireActual('bcrypt');
      db.user.findOne.mockResolvedValue({
        id: 7,
        isActive: true,
        passwordHash: await bcrypt.hash('Right@123', 4),
      });
      await expect(
        service.changePassword(userCtx, 'Wrong@123', 'New@123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates the hash when the current password matches', async () => {
      const bcrypt = jest.requireActual('bcrypt');
      const existing = {
        id: 7,
        isActive: true,
        passwordHash: await bcrypt.hash('Right@123', 4),
      };
      db.user.findOne.mockResolvedValue(existing);
      const result = await service.changePassword(
        userCtx,
        'Right@123',
        'New@123',
      );
      expect(result.message).toMatch(/updated/i);
      expect(existing.passwordHash).toMatch(/^\$2[aby]\$/);
    });

    it('throws 404 when the user record is gone', async () => {
      db.user.findOne.mockResolvedValue(null);
      await expect(
        service.changePassword(userCtx, 'Right@123', 'New@123'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
