import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from './entities/staff.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
  ) {}

  findAll() {
    return this.staffRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const staff = await this.staffRepository.findOne({ where: { id } });

    if (!staff) {
      throw new NotFoundException(
        `Membre du personnel introuvable (id: ${id})`,
      );
    }

    return staff;
  }

  async create(dto: CreateStaffDto) {
    const existing = await this.staffRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException(`Un membre existe déjà avec cet email`);
    }

    return this.staffRepository.save(this.staffRepository.create(dto));
  }

  async update(id: string, dto: UpdateStaffDto) {
    const staff = await this.findOne(id);
    Object.assign(staff, dto);
    return this.staffRepository.save(staff);
  }

  async remove(id: string) {
    const staff = await this.findOne(id);
    await this.staffRepository.remove(staff);
  }
}
