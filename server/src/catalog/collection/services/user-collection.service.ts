import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class UserCollectionService {
  constructor(private readonly database: DatabaseService) {}

  async listActive() {
    return this.database.collection.find({
      where: { isActive: true },
      order: { id: 'ASC' },
    });
  }
}
