import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryZone } from './entities/delivery-zone.entity';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

@Injectable()
export class DeliveryZonesService {
  constructor(
    @InjectRepository(DeliveryZone)
    private zonesRepository: Repository<DeliveryZone>,
  ) {}

  findAll() {
    return this.zonesRepository.find({
      where: { isActive: true },
      order: { commune: 'ASC' },
    });
  }

  async findOne(id: string) {
    const zone = await this.zonesRepository.findOne({ where: { id } });

    if (!zone) {
      throw new NotFoundException(`Zone introuvable (id: ${id})`);
    }

    return zone;
  }

  async create(dto: CreateDeliveryZoneDto) {
    const existing = await this.zonesRepository.findOne({
      where: { id: dto.id },
    });

    if (existing) {
      throw new ConflictException(`Une zone avec l'id ${dto.id} existe déjà`);
    }

    return this.zonesRepository.save(this.zonesRepository.create(dto));
  }

  async update(id: string, dto: UpdateDeliveryZoneDto) {
    const zone = await this.findOne(id);
    Object.assign(zone, dto);
    return this.zonesRepository.save(zone);
  }

  async remove(id: string) {
    const zone = await this.findOne(id);
    await this.zonesRepository.remove(zone);
  }
}
