import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { AuthProvider } from '../common/enums/auth-provider.enum';
import { IngredientUnit } from '../common/enums/ingredient-unit.enum';
import { MealCategory } from '../common/enums/meal-category.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { Role } from '../common/enums/role.enum';
import { ServiceType } from '../common/enums/service-type.enum';
import { StaffRole } from '../common/enums/staff-role.enum';
import { StaffStatus } from '../common/enums/staff-status.enum';
import { DeliveryZone } from '../delivery-zones/entities/delivery-zone.entity';
import { Ingredient } from '../ingredients/entities/ingredient.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { MenuItemIngredient } from '../menu/entities/menu-item-ingredient.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Staff } from '../staff/entities/staff.entity';
import { User } from '../users/entities/user.entity';

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
  {
    name: 'Pastels',
    description: 'Beignets farcis au thon et aux épices',
    price: 1500,
    category: MealCategory.ENTREE,
    available: true,
    image: 'https://images.unsplash.com/photo-1539136788836-5699e78bfc75',
    meal: 'any',
    prepTimeMinutes: 20,
  },
];

const INGREDIENTS = [
  {
    name: 'Riz brisé',
    currentStock: 120,
    unit: IngredientUnit.KG,
    minStock: 40,
    reorderThreshold: 60,
    criticalStock: 20,
    supplier: 'Société Riz Dakar',
    costPerUnit: 850,
    lastRestockedAt: '2026-07-01T08:00:00.000Z',
    lastCountedAt: '2026-07-05T08:30:00.000Z',
  },
  {
    name: 'Poisson',
    currentStock: 18,
    unit: IngredientUnit.KG,
    minStock: 12,
    reorderThreshold: 20,
    criticalStock: 8,
    supplier: 'Marché Kermel',
    costPerUnit: 2400,
    lastRestockedAt: '2026-07-04T07:30:00.000Z',
    lastCountedAt: '2026-07-05T08:30:00.000Z',
  },
  {
    name: 'Poulet',
    currentStock: 26,
    unit: IngredientUnit.KG,
    minStock: 15,
    reorderThreshold: 25,
    criticalStock: 10,
    supplier: 'Ferme de Rufisque',
    costPerUnit: 1800,
    lastRestockedAt: '2026-07-03T07:30:00.000Z',
    lastCountedAt: '2026-07-05T08:30:00.000Z',
  },
  {
    name: 'Oignons',
    currentStock: 35,
    unit: IngredientUnit.KG,
    minStock: 20,
    reorderThreshold: 30,
    criticalStock: 10,
    supplier: 'Négociant local',
    costPerUnit: 600,
    lastRestockedAt: '2026-07-02T09:00:00.000Z',
    lastCountedAt: '2026-07-05T08:30:00.000Z',
  },
  {
    name: 'Bissap sec',
    currentStock: 6,
    unit: IngredientUnit.KG,
    minStock: 4,
    reorderThreshold: 8,
    criticalStock: 3,
    supplier: 'Coopérative Kaolack',
    costPerUnit: 1500,
    lastRestockedAt: '2026-07-01T10:00:00.000Z',
    lastCountedAt: '2026-07-05T08:30:00.000Z',
  },
];

const STAFF = [
  {
    name: 'Aminata Diop',
    email: 'admin.staff@linguere.sn',
    role: StaffRole.ADMIN,
    phone: '+221770000001',
    salary: 850000,
    hireDate: '2024-01-10',
    shift: 'Jour',
    zone: 'Direction',
    status: StaffStatus.ACTIVE,
  },
  {
    name: 'Moussa Sarr',
    email: 'chef1@linguere.sn',
    role: StaffRole.CHEF,
    phone: '+221770000002',
    salary: 450000,
    hireDate: '2024-03-15',
    shift: 'Matin',
    zone: 'Cuisine chaude',
    status: StaffStatus.ACTIVE,
  },
  {
    name: 'Fatou Sow',
    email: 'waiter1@linguere.sn',
    role: StaffRole.WAITER,
    phone: '+221770000003',
    salary: 280000,
    hireDate: '2024-04-05',
    shift: 'Soir',
    zone: 'Salle principale',
    status: StaffStatus.ACTIVE,
  },
  {
    name: 'Cheikh Fall',
    email: 'delivery1@linguere.sn',
    role: StaffRole.DELIVERY,
    phone: '+221770000004',
    salary: 300000,
    hireDate: '2024-05-20',
    shift: 'Jour',
    zone: 'Dakar centre',
    status: StaffStatus.ACTIVE,
  },
];

// Recette indicative de chaque plat, pour démontrer le décrément de stock
// automatique à la commande (feature/ingredient-stock-consumption).
const RECIPES: Record<
  string,
  Array<{ ingredientName: string; quantityRequired: number }>
> = {
  Thiéboudienne: [
    { ingredientName: 'Riz brisé', quantityRequired: 0.3 },
    { ingredientName: 'Poisson', quantityRequired: 0.25 },
    { ingredientName: 'Oignons', quantityRequired: 0.1 },
  ],
  'Yassa Poulet': [
    { ingredientName: 'Poulet', quantityRequired: 0.35 },
    { ingredientName: 'Oignons', quantityRequired: 0.15 },
  ],
  Bissap: [{ ingredientName: 'Bissap sec', quantityRequired: 0.05 }],
};

const DELIVERY_ZONES = [
  'dkr-plateau-centre',
  'dkr-medina-tilene',
  'dkr-fann-point-e',
  'dkr-mermoz-sacre-coeur',
];

async function findOrCreateUser(
  usersRepository: Repository<User>,
  payload: Partial<User> & { email: string },
) {
  let user = await usersRepository.findOne({ where: { email: payload.email } });
  if (!user) {
    user = usersRepository.create(payload);
    user = await usersRepository.save(user);
  }
  return user;
}

async function findOrCreateMenuItem(
  menuRepository: Repository<MenuItem>,
  payload: (typeof MENU_ITEMS)[number],
) {
  let item = await menuRepository.findOne({ where: { name: payload.name } });
  if (!item) {
    item = menuRepository.create(payload);
    item = await menuRepository.save(item);
  }
  return item;
}

async function findOrCreateIngredient(
  ingredientsRepository: Repository<Ingredient>,
  payload: (typeof INGREDIENTS)[number],
) {
  let item = await ingredientsRepository.findOne({
    where: { name: payload.name },
  });
  if (!item) {
    item = ingredientsRepository.create(payload);
    item = await ingredientsRepository.save(item);
  }
  return item;
}

async function findOrCreateStaff(
  staffRepository: Repository<Staff>,
  payload: (typeof STAFF)[number],
) {
  let member = await staffRepository.findOne({
    where: { email: payload.email },
  });
  if (!member) {
    member = staffRepository.create(payload);
    member = await staffRepository.save(member);
  }
  return member;
}

// Exportee separement pour etre testee sans dependre de process.exit().
export function shouldSkipSeed(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV === 'production' && env.SEED_FORCE !== 'true';
}

async function seed() {
  if (shouldSkipSeed(process.env)) {
    console.log(
      'Seed Linguere: ignoré en production (le compte admin/mot de passe est fixe). ' +
        'Définissez SEED_FORCE=true pour forcer l’exécution.',
    );
    process.exit(0);
  }

  console.log('Seed Linguere: démarrage...');
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const menuRepository = app.get<Repository<MenuItem>>(
    getRepositoryToken(MenuItem),
  );
  const zonesRepository = app.get<Repository<DeliveryZone>>(
    getRepositoryToken(DeliveryZone),
  );
  const ingredientsRepository = app.get<Repository<Ingredient>>(
    getRepositoryToken(Ingredient),
  );
  const staffRepository = app.get<Repository<Staff>>(getRepositoryToken(Staff));
  const ordersRepository = app.get<Repository<Order>>(
    getRepositoryToken(Order),
  );
  const recipeRepository = app.get<Repository<MenuItemIngredient>>(
    getRepositoryToken(MenuItemIngredient),
  );

  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const customerPassword = await bcrypt.hash('Client123!', 10);

  const admin = await findOrCreateUser(usersRepository, {
    email: 'admin@linguere.sn',
    fullName: 'Chef Admin',
    password: adminPassword,
    role: Role.ADMIN,
    provider: AuthProvider.LOCAL,
    isEmailVerified: true,
    providerId: null,
    otpCode: null,
    otpExpiresAt: null,
  });

  const customer = await findOrCreateUser(usersRepository, {
    email: 'client@linguere.sn',
    fullName: 'Client Test',
    password: customerPassword,
    role: Role.CLIENT,
    provider: AuthProvider.LOCAL,
    isEmailVerified: true,
    providerId: null,
    otpCode: null,
    otpExpiresAt: null,
  });

  const menuItems: MenuItem[] = [];
  for (const item of MENU_ITEMS) {
    menuItems.push(await findOrCreateMenuItem(menuRepository, item));
  }

  const ingredientsByName = new Map<string, Ingredient>();
  for (const ingredient of INGREDIENTS) {
    const saved = await findOrCreateIngredient(
      ingredientsRepository,
      ingredient,
    );
    ingredientsByName.set(saved.name, saved);
  }

  for (const menuItem of menuItems) {
    const recipeLines = RECIPES[menuItem.name];
    if (!recipeLines) continue;

    const alreadySeeded = await recipeRepository.count({
      where: { menuItemId: menuItem.id },
    });
    if (alreadySeeded > 0) continue;

    for (const line of recipeLines) {
      const ingredient = ingredientsByName.get(line.ingredientName);
      if (!ingredient) continue;

      await recipeRepository.save(
        recipeRepository.create({
          menuItemId: menuItem.id,
          ingredientId: ingredient.id,
          quantityRequired: line.quantityRequired,
        }),
      );
    }
  }

  for (const member of STAFF) {
    await findOrCreateStaff(staffRepository, member);
  }

  for (const zoneId of DELIVERY_ZONES) {
    const existing = await zonesRepository.findOne({ where: { id: zoneId } });
    if (!existing) {
      const zone = zonesRepository.create({
        id: zoneId,
        department: 'Dakar',
        commune: 'Plateau',
        sector: zoneId,
        description: 'Zone de test',
        fee: 1500,
        etaMinutes: 30,
        lat: 14.6937,
        lng: -17.4441,
        mapX: 120,
        mapY: 80,
        landmarks: ['Point de test'],
        isActive: true,
      });
      await zonesRepository.save(zone);
    }
  }

  const existingCustomerOrders = await ordersRepository.count({
    where: { userId: customer.id },
  });
  if (existingCustomerOrders === 0 && menuItems.length >= 4) {
    const chef = await staffRepository.findOne({
      where: { role: StaffRole.CHEF },
    });
    const courier = await staffRepository.findOne({
      where: { role: StaffRole.DELIVERY },
    });
    const zone = await zonesRepository.findOne({
      where: { id: DELIVERY_ZONES[0] },
    });

    const dineInOrder = ordersRepository.create({
      userId: customer.id,
      serviceType: ServiceType.DINE_IN,
      tableNumber: 4,
      deliveryZoneId: null,
      deliveryAddress: null,
      deliveryNotes: 'Table près de la fenêtre',
      customerName: customer.fullName,
      customerPhone: '+221770100001',
      assignedChefId: chef?.id ?? null,
      assignedChefName: chef?.name ?? null,
      courierId: null,
      courierName: null,
      deliveryFee: 0,
      subtotalAmount: 5000,
      totalAmount: 5000,
      status: OrderStatus.PREPARING,
      items: [
        Object.assign(new OrderItem(), {
          menuItemId: menuItems[0].id,
          menuItem: menuItems[0],
          quantity: 1,
          unitPrice: 3500,
        }),
        Object.assign(new OrderItem(), {
          menuItemId: menuItems[2].id,
          menuItem: menuItems[2],
          quantity: 1,
          unitPrice: 1000,
        }),
      ],
    });

    const deliveryOrder = ordersRepository.create({
      userId: customer.id,
      serviceType: ServiceType.DELIVERY,
      tableNumber: null,
      deliveryZoneId: zone?.id ?? null,
      deliveryAddress: 'Point E, rue 10',
      deliveryNotes: 'Appeler à l’arrivée',
      customerName: customer.fullName,
      customerPhone: '+221770100001',
      assignedChefId: chef?.id ?? null,
      assignedChefName: chef?.name ?? null,
      courierId: courier?.id ?? null,
      courierName: courier?.name ?? null,
      deliveryFee: Number(zone?.fee ?? 1500),
      subtotalAmount: 5500,
      totalAmount: 7000,
      status: OrderStatus.DELIVERED,
      rating: 5,
      review: 'Service rapide et plat très bon',
      ratedAt: new Date('2026-07-04T19:30:00.000Z'),
      items: [
        Object.assign(new OrderItem(), {
          menuItemId: menuItems[1].id,
          menuItem: menuItems[1],
          quantity: 1,
          unitPrice: 4000,
        }),
        Object.assign(new OrderItem(), {
          menuItemId: menuItems[3].id,
          menuItem: menuItems[3],
          quantity: 1,
          unitPrice: 1500,
        }),
      ],
    });

    const cancelledOrder = ordersRepository.create({
      userId: customer.id,
      serviceType: ServiceType.DELIVERY,
      tableNumber: null,
      deliveryZoneId: zone?.id ?? null,
      deliveryAddress: 'Rufisque centre',
      deliveryNotes: 'Client absent',
      customerName: customer.fullName,
      customerPhone: '+221770100001',
      assignedChefId: chef?.id ?? null,
      assignedChefName: chef?.name ?? null,
      courierId: courier?.id ?? null,
      courierName: courier?.name ?? null,
      deliveryFee: Number(zone?.fee ?? 1500),
      subtotalAmount: 1000,
      totalAmount: Number(zone?.fee ?? 1500) + 1000,
      status: OrderStatus.CANCELLED,
      items: [
        Object.assign(new OrderItem(), {
          menuItemId: menuItems[2].id,
          menuItem: menuItems[2],
          quantity: 1,
          unitPrice: 1000,
        }),
      ],
    });

    await ordersRepository.save([dineInOrder, deliveryOrder, cancelledOrder]);
    console.log('3 commandes de test insérées');
  }

  console.log(`Admin: ${admin.email} / Admin123!`);
  console.log(`Client: ${customer.email} / Client123!`);
  console.log(`${menuItems.length} plats disponibles`);

  await app.close();
  process.exit(0);
}

// Ne s'auto-execute que lorsque ce fichier est lance directement (npm run
// seed), jamais lors d'un simple import (ex: seed.spec.ts).
if (require.main === module) {
  seed().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
