import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class UserAttributeService {
  constructor(private readonly database: DatabaseService) {}

  async listActive() {
    return this.database.attribute.find({
      where: { isActive: true },
      relations: { values: true },
      order: { id: 'ASC' },
    });
  }
}
