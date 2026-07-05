import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { User } from '../users/entities/user.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { DeliveryZone } from '../delivery-zones/entities/delivery-zone.entity';
import { Role } from '../common/enums/role.enum';
import { AuthProvider } from '../common/enums/auth-provider.enum';
import { MealCategory } from '../common/enums/meal-category.enum';
import { Repository } from 'typeorm';

const MENU_ITEMS = [
  {
    name: 'Thiéboudienne',
    description: 'Riz au poisson au goût du Sénégal',
    price: 3500,
    category: MealCategory.PLAT,
    available: true,
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554',
    meal: 'lunch',
    prepTimeMinutes: 35,
  },
  {
    name: 'Yassa Poulet',
    description: 'Poulet mariné, oignons et citron',
    price: 4000,
    category: MealCategory.PLAT,
    available: true,
    image: 'https://images.unsplash.com/photo-1604908554162-45f5a7f0c3c1',
    meal: 'dinner',
    prepTimeMinutes: 30,
  },
  {
    name: 'Bissap',
    description: 'Boisson traditionnelle à l’hibiscus',
    price: 1000,
    category: MealCategory.BOISSON,
    available: true,
    image: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625',
    meal: 'any',
    prepTimeMinutes: 5,
  },
];

const ZONES = [
  {
    id: 'dkr-plateau-centre',
    commune: 'Plateau',
    description: 'Centre-ville et alentours immédiats',
    fee: 1000,
    lat: 14.6937,
    lng: -17.4441,
    mapX: 120,
    mapY: 80,
    landmarks: ['Place de l’Indépendance', 'Gare Routière', 'Port Autonome'],
    isActive: true,
  },
  {
    id: 'dkr-almadies',
    commune: 'Almadies',
    description: 'Zone résidentielle et touristique',
    fee: 1500,
    lat: 14.751,
    lng: -17.517,
    mapX: 180,
    mapY: 60,
    landmarks: ['Ngor', 'Yoff', 'Mamelles'],
    isActive: true,
  },
];

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const menuRepository = app.get<Repository<MenuItem>>(
    getRepositoryToken(MenuItem),
  );
  const zonesRepository = app.get<Repository<DeliveryZone>>(
    getRepositoryToken(DeliveryZone),
  );

  if (
    !(await usersRepository.findOne({ where: { email: 'admin@linguere.sn' } }))
  ) {
    await usersRepository.save(
      usersRepository.create({
        email: 'admin@linguere.sn',
        fullName: 'Chef Admin',
        password: await bcrypt.hash('Admin123!', 10),
        role: Role.ADMIN,
        provider: AuthProvider.LOCAL,
        isEmailVerified: true,
      }),
    );
    console.log('Admin créé : admin@linguere.sn / Admin123!');
  }

  if ((await menuRepository.count()) === 0) {
    await menuRepository.save(
      MENU_ITEMS.map((item) => menuRepository.create(item)),
    );
    console.log(` ${MENU_ITEMS.length} plats insérés`);
  }

  if ((await zonesRepository.count()) === 0) {
    await zonesRepository.save(
      ZONES.map((zone) => zonesRepository.create(zone)),
    );
    console.log(` ${ZONES.length} zones insérées`);
  }

  await app.close();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
