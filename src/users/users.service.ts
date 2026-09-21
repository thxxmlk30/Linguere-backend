import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult, toSkipTake } from '../common/utils/pagination.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(
    pagination?: PaginationQueryDto,
  ): Promise<PaginatedResult<User>> {
    const [data, total] = await this.usersRepository.findAndCount({
      ...toSkipTake(pagination),
    });
    return { data, total };
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updateData);
    return this.usersRepository.save(user);
  }
}
