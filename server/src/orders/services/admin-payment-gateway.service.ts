import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { PaymentGateway } from '../../database/entities';
import {
  creatorFields,
  slugify,
  updaterFields,
} from '../../catalog/utils/catalog.utils';
import {
  CreatePaymentGatewayDto,
  UpdatePaymentGatewayDto,
} from '../dtos/payment-gateway.dto';
import {
  manualPaymentFields,
  requiredGatewayAccountFields,
} from '../utils/payment-gateway.util';
import { sanitizeRichText } from '../utils/rich-text';
import type { JwtPayload } from '../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../common/decorators/pagination-params';
import { FileHandleService } from '../../file/services/file-handle.service';
import { UPLOAD_FOLDERS } from '../../file/upload-folders';

/**
 * Admin CRUD for payment gateways. `slug` is always derived here from the name
 * (never accepted from the client) because it becomes `Payment.method`.
 */
@Injectable()
export class AdminPaymentGatewayService {
  constructor(
    private readonly database: DatabaseService,
    private readonly fileHandle: FileHandleService,
  ) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const qb = this.database.paymentGateway
      .createQueryBuilder('gateway')
      .orderBy('gateway.id', 'ASC')
      .skip(pagination.offset)
      .take(pagination.size);

    if (query.q)
      qb.andWhere('gateway.name ILIKE :q', { q: `%${query.q}%` });
    if (query.type) qb.andWhere('gateway.type = :type', { type: query.type });
    if (query.isManual !== undefined)
      qb.andWhere('gateway.isManual = :isManual', {
        isManual: query.isManual === 'true',
      });
    if (query.isActive !== undefined)
      qb.andWhere('gateway.isActive = :isActive', {
        isActive: query.isActive === 'true',
      });

    const [rows, count] = await qb.getManyAndCount();
    return getPaginateData(rows, count, pagination);
  }

  async findOne(id: number) {
    const gateway = await this.database.paymentGateway.findOne({
      where: { id },
    });
    if (!gateway) throw new NotFoundException('Payment gateway not found');
    return gateway;
  }

  async create(dto: CreatePaymentGatewayDto, user?: JwtPayload) {
    const data = this.normalize(dto);
    // The DTO already enforces the create-time rules; this catches the merged
    // shape too, so both paths reject the same incomplete gateway.
    assertGatewayComplete(data);
    const gateway = this.database.paymentGateway.create({
      ...data,
      slug: await this.uniqueSlug(slugify(dto.name)),
      isActive: dto.isActive ?? true,
      ...creatorFields(user),
    });
    return this.database.paymentGateway.save(gateway);
  }

  async update(
    id: number,
    dto: UpdatePaymentGatewayDto,
    user?: JwtPayload,
  ) {
    const gateway = await this.findOne(id);
    const data = this.normalize(dto);

    // Re-check the *merged* row: a per-field rule cannot see that switching
    // mfs → bank leaves bankName null on a gateway that was already saved.
    assertGatewayComplete({
      type: data.type ?? gateway.type,
      isManual: data.isManual ?? gateway.isManual,
      accountName: data.accountName ?? gateway.accountName,
      accountNumber: data.accountNumber ?? gateway.accountNumber,
      bankName: data.bankName ?? gateway.bankName,
      branchName: data.branchName ?? gateway.branchName,
    });

    if (dto.name && dto.name !== gateway.name) {
      gateway.slug = await this.uniqueSlug(slugify(dto.name), id);
    }

    const previousIconPath = gateway.iconPath;
    Object.assign(gateway, data, updaterFields(user));
    const saved = await this.database.paymentGateway.save(gateway);
    this.dropReplacedIcon(previousIconPath, saved.iconPath);
    return saved;
  }

  async remove(id: number) {
    const gateway = await this.findOne(id);
    await this.database.paymentGateway.softRemove(gateway);
    return { success: true };
  }

  /** Feature-owned upload: stores in the payment-gateway folder. */
  uploadIcon(file: Express.Multer.File) {
    return this.fileHandle.uploadFile(file, UPLOAD_FOLDERS.paymentGateway);
  }

  /** Feature-owned removal: clears the fields and deletes the file. */
  async removeIcon(id: number, user?: JwtPayload) {
    const gateway = await this.findOne(id);
    const previous = gateway.iconPath;
    Object.assign(gateway, { iconUrl: '', iconPath: '' }, updaterFields(user));
    const saved = await this.database.paymentGateway.save(gateway);
    if (previous) this.fileHandle.removeIfExists(previous);
    return saved;
  }

  /** Suffix the slug until it is free (names repeat, slugs must not). */
  private async uniqueSlug(base: string, ignoreId?: number) {
    const seed = base || 'gateway';
    let slug = seed;
    let suffix = 2;
    /* eslint-disable no-await-in-loop */
    for (;;) {
      const clash = await this.database.paymentGateway.findOne({
        where: { slug },
      });
      if (!clash || clash.id === ignoreId) return slug;
      slug = `${seed}-${suffix}`;
      suffix += 1;
    }
    /* eslint-enable no-await-in-loop */
  }

  /** Delete a replaced icon only when the new one is a different file. */
  private dropReplacedIcon(previous: string | undefined, next: string | undefined) {
    if (!previous || previous === next) return;
    if (this.fileHandle.belongsTo(UPLOAD_FOLDERS.paymentGateway, previous)) {
      this.fileHandle.removeIfExists(previous);
    }
  }

  /** Sanitize rich text and drop manual-only fields an automated gateway has. */
  private normalize(
    dto: CreatePaymentGatewayDto | UpdatePaymentGatewayDto,
  ): Partial<PaymentGateway> {
    const data = { ...dto } as Partial<PaymentGateway> & { slug?: string };
    delete data.slug; // always backend-owned

    // Rich text is sanitized once here, at the write boundary. Empty string is
    // how this project clears a nullable column (see admin-category).
    if (dto.description !== undefined) {
      data.description = sanitizeRichText(dto.description);
    }
    if (dto.isManual === false) {
      data.accountName = '';
      data.accountNumber = '';
      data.bankName = '';
      data.branchName = '';
    }
    return data;
  }
}

/** Throws when a manual gateway is missing an account field for its type. */
function assertGatewayComplete(gateway: {
  type?: string;
  isManual?: boolean;
  accountName?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  branchName?: string | null;
}) {
  if (!gateway.isManual) return;
  const type = gateway.type ?? '';
  const missing = requiredGatewayAccountFields(type, true).filter(
    (field) =>
      !String(
        gateway[field as 'accountName' | 'accountNumber' | 'bankName' | 'branchName'] ?? '',
      ).trim(),
  );
  if (missing.length) {
    throw new BadRequestException(
      `${missing.join(', ')} ${
        missing.length === 1 ? 'is' : 'are'
      } required for a manual ${type} payment gateway`,
    );
  }
  // A manual gateway with no customer-facing field would accept nothing.
  if (!manualPaymentFields(type).length) {
    throw new BadRequestException(
      `Unsupported manual payment gateway type "${type}"`,
    );
  }
}