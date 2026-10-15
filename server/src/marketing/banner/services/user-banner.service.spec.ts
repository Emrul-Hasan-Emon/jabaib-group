import { Test } from '@nestjs/testing';
import { UserBannerService } from './user-banner.service';
import { DatabaseService } from '../../../database/database.service';

function banner(partial: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: 'Eid Sale',
    titleBN: 'ঈদ সেল',
    imageUrl: 'jabaib/banner/eid.jpg',
    position: 'hero',
    sortOrder: 1,
    startsAt: null,
    endsAt: null,
    isActive: true,
    ...partial,
  };
}

describe('UserBannerService (storefront banners)', () => {
  let service: UserBannerService;
  let db: { banner: { find: jest.Mock } };

  beforeEach(async () => {
    db = { banner: { find: jest.fn(async () => []) } };
    const module = await Test.createTestingModule({
      providers: [
        UserBannerService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get(UserBannerService);
  });

  it('only returns active banners', async () => {
    // the repo applies the where.isActive filter — mimic DB behaviour
    db.banner.find.mockImplementation(async ({ where }) =>
      [banner({ isActive: false }), banner()].filter((b) =>
        where.isActive === undefined ? true : b.isActive === where.isActive,
      ),
    );
    const result = await service.list();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Eid Sale');
    expect(db.banner.find.mock.calls[0][0].where.isActive).toBe(true);
  });

  it('filters out banners outside their date window', async () => {
    const now = Date.now();
    db.banner.find.mockResolvedValue([
      banner({
        id: 1,
        startsAt: new Date(now - 1000),
        endsAt: new Date(now + 1000),
      }),
      banner({ id: 2, startsAt: new Date(now + 10_000) }), // starts later
      banner({ id: 3, endsAt: new Date(now - 10_000) }), // already ended
    ]);
    const result = await service.list();
    expect(result.map((b) => b.id)).toEqual([1]);
  });

  it('honors the position filter', async () => {
    await service.list('side');
    expect(db.banner.find.mock.calls[0][0].where.position).toBe('side');
  });
});
