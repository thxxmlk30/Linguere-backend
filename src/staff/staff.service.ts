import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Staff } from './entities/staff.entity';
import { User } from '../users/entities/user.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ProvisionStaffAccountDto } from './dto/provision-staff-account.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult, toSkipTake } from '../common/utils/pagination.util';
import { Role } from '../common/enums/role.enum';
import { AuthProvider } from '../common/enums/auth-provider.enum';
import { StaffRole } from '../common/enums/staff-role.enum';
import { MailService } from '../mail/mail.service';
import { isDevEnvironment } from '../common/utils/env.util';

const STAFF_ROLE_TO_ROLE: Record<StaffRole, Role> = {
  [StaffRole.ADMIN]: Role.ADMIN,
  [StaffRole.CHEF]: Role.CHEF,
  [StaffRole.WAITER]: Role.WAITER,
  [StaffRole.DELIVERY]: Role.DELIVERY,
};

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private mailService: MailService,
  ) {}

  async findAll(
    pagination?: PaginationQueryDto,
  ): Promise<PaginatedResult<Staff>> {
    const [data, total] = await this.staffRepository.findAndCount({
      order: { name: 'ASC' },
      ...toSkipTake(pagination),
    });
    return { data, total };
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

  /**
   * Cree un compte de connexion (User) pour une fiche Staff existante, et
   * les lie. C'est le seul moyen pour un chef/serveur/livreur d'obtenir un
   * acces au dashboard : une fiche Staff seule (RH) ne permet jamais de se
   * connecter.
   */
  async provisionAccount(id: string, dto: ProvisionStaffAccountDto) {
    const staff = await this.findOne(id);

    if (staff.userId) {
      throw new ConflictException(
        'Ce membre du personnel a déjà un accès de connexion',
      );
    }

    const existingUser = await this.usersRepository.findOne({
      where: { email: staff.email },
    });
    if (existingUser) {
      throw new ConflictException(
        `Un compte existe déjà avec l'email ${staff.email} ; il doit être lié manuellement plutôt que recréé`,
      );
    }

    const password = dto.password ?? randomBytes(9).toString('base64url');
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.usersRepository.save(
      this.usersRepository.create({
        email: staff.email,
        fullName: staff.name,
        password: hashedPassword,
        role: STAFF_ROLE_TO_ROLE[staff.role],
        provider: AuthProvider.LOCAL,
        isEmailVerified: true,
      }),
    );

    staff.userId = user.id;
    await this.staffRepository.save(staff);

    const { delivered } = await this.mailService.sendStaffCredentials(
      staff.email,
      staff.name,
      password,
    );

    const response: {
      message: string;
      email: string;
      devPassword?: string;
    } = {
      message: delivered
        ? 'Accès créé, les identifiants ont été envoyés par email.'
        : "Accès créé, mais l'email n'a pas pu être envoyé.",
      email: staff.email,
    };

    if (isDevEnvironment()) {
      response.devPassword = password;
    }

    return response;
  }
}
