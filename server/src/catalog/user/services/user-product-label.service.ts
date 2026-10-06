import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class UserProductLabelService {
  constructor(private readonly database: DatabaseService) {}

  async listActive() {
    return this.database.productLabel.find({
      where: { isActive: true },
      order: { id: 'ASC' },
    });
  }
}
