import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminCategoryService } from './admin-category.service';
import { DatabaseService } from '../../../database/database.service';
import { FileHandleService } from '../../../file/services/file-handle.service';
import type { JwtPayload } from '../../../auth/jwt/jwt-payload';

const admin: JwtPayload = {
  id: 2,
  sub: 'catalog@jabaib.test',
  type: 'admin',
  role: 'admin',
  userName: 'Catalog Admin',
};

describe('AdminCategoryService (audit tracker fields)', () => {
  let service: AdminCategoryService;
  let db: {
    category: {
      create: jest.Mock;
      save: jest.Mock;
      findOne: jest.Mock;
      find: jest.Mock;
      findAndCount: jest.Mock;
      softRemove: jest.Mock;
      createQueryBuilder: jest.Mock;
    };
  };
  const fileHandle = {
    uploadFile: jest.fn(),
    removeIfExists: jest.fn(),
    belongsTo: jest.fn(() => true),
  };

  beforeEach(async () => {
    db = {
      category: {
        create: jest.fn((row) => ({ ...row })),
        save: jest.fn((row) => Promise.resolve(row)),
        findOne: jest.fn(),
        find: jest.fn(() => Promise.resolve([])),
        findAndCount: jest.fn(async () => [[], 0]),
        softRemove: jest.fn((row) => Promise.resolve(row)),
        createQueryBuilder: jest.fn(
          () =>
            ({
              where: jest.fn(
                () => ({ getOne: jest.fn(async () => null) }) as never,
              ),
              getOne: jest.fn(async () => null),
            }) as never,
        ),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        AdminCategoryService,
        { provide: DatabaseService, useValue: db },
        { provide: FileHandleService, useValue: fileHandle },
      ],
    }).compile();
    service = module.get(AdminCategoryService);
  });

  describe('create', () => {
    it('slugifies the name and stamps creator fields from the actor', async () => {
      const category = await service.create({ name: 'Men’s T-Shirts' }, admin);
      expect(category).toEqual(
        expect.objectContaining({
          name: 'Men’s T-Shirts',
          slug: 'men-s-t-shirts',
          createdBy: 2,
          creatorType: 'admin',
          creatorName: 'Catalog Admin',
        }),
      );
      expect(db.category.save).toHaveBeenCalledTimes(1);
    });

    it('rejects a duplicate slug (400) before saving', async () => {
      db.category.createQueryBuilder.mockReturnValue({
        where: jest.fn(
          () => ({ getOne: jest.fn(async () => ({ id: 9 })) }) as never,
        ),
        getOne: jest.fn(async () => ({ id: 9 })),
      });
      await expect(
        service.create({ name: 'Men’s T-Shirts' }, admin),
      ).rejects.toThrow(BadRequestException);
      expect(db.category.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('applies updater fields and preserves the slug when unchanged', async () => {
      const existing = {
        id: 1,
        name: 'Old Name',
        slug: 'old-name',
        imagePath: null,
      };
      db.category.findOne.mockResolvedValue(existing);

      await service.update(1, { name: 'New Name' }, admin);

      expect(existing).toEqual(
        expect.objectContaining({
          name: 'New Name',
          slug: 'new-name',
          updatedBy: 2,
          updaterType: 'admin',
          updaterName: 'Catalog Admin',
        }),
      );
    });

    it('deletes the superseded image file only after the row is saved', async () => {
      const existing = {
        id: 2,
        name: 'Kids',
        slug: 'kids',
        imagePath: 'jabaib/category/old.png',
      };
      db.category.findOne.mockResolvedValue(existing);

      await service.update(
        2,
        { name: 'Kids Updated', imagePath: 'jabaib/category/new.png' },
        admin,
      );

      expect(db.category.save).toHaveBeenCalledTimes(1);
      expect(fileHandle.removeIfExists).toHaveBeenCalledWith(
        'jabaib/category/old.png',
      );
    });

    it('rejects a category being its own parent (400)', async () => {
      db.category.findOne.mockResolvedValue({
        id: 3,
        name: 'Self',
        slug: 'self',
      });
      await expect(service.update(3, { parentId: 3 }, admin)).rejects.toThrow(
        BadRequestException,
      );
      expect(db.category.save).not.toHaveBeenCalled();
    });

    it('throws 404 for a missing category', async () => {
      db.category.findOne.mockResolvedValue(null);
      await expect(
        service.update(99, { name: 'Ghost' }, admin),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeImage (feature-owned file cleanup)', () => {
    it('clears image refs and deletes the physical file, stamped as a change', async () => {
      const existing = {
        id: 5,
        name: 'Women',
        slug: 'women',
        imageUrl: 'http://cdn/x.png',
        imagePath: 'jabaib/category/x.png',
      };
      db.category.findOne.mockResolvedValue(existing);

      const saved = await service.removeImage(5, admin);

      expect(saved.imageUrl).toBe('');
      expect(saved.imagePath).toBe('');
      expect(saved).toEqual(
        expect.objectContaining({
          updatedBy: 2,
          updaterName: 'Catalog Admin',
        }),
      );
      expect(fileHandle.removeIfExists).toHaveBeenCalledWith(
        'jabaib/category/x.png',
      );
    });
  });
});
