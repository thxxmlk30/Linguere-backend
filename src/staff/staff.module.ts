import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Staff } from './entities/staff.entity';
import { User } from '../users/entities/user.entity';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([Staff, User]), MailModule],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
