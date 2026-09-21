import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { MenuItem } from '../src/menu/entities/menu-item.entity';
import { User } from '../src/users/entities/user.entity';
import { MealCategory } from '../src/common/enums/meal-category.enum';

interface RegisterResponse {
  email: string;
  devOtpCode?: string;
}

interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; password?: string };
}

interface OrderResponse {
  subtotalAmount: number;
  status: string;
}

describe('Parcours client : inscription -> OTP -> connexion -> commande (e2e)', () => {
  let app: INestApplication<App>;
  let usersRepository: Repository<User>;
  let menuRepository: Repository<MenuItem>;
  let menuItem: MenuItem;

  const email = `e2e-${Date.now()}@linguere.sn`;
  const password = 'MotDePasse123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['metrics'] });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();

    usersRepository = moduleFixture.get(getRepositoryToken(User));
    menuRepository = moduleFixture.get(getRepositoryToken(MenuItem));

    menuItem = await menuRepository.save(
      menuRepository.create({
        name: `Plat e2e ${Date.now()}`,
        price: 2500,
        category: MealCategory.PLAT,
        available: true,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  let accessToken: string;

  it('inscrit un nouveau client', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, name: 'Client E2E', password })
      .expect(201);

    const body = response.body as RegisterResponse;
    expect(body.email).toBe(email);
    // Sous NODE_ENV=test, le code OTP ne fuit plus dans la reponse (Lot 1).
    expect(body.devOtpCode).toBeUndefined();
  });

  it("refuse la connexion tant que l'email n'est pas vérifié", async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(401);
  });

  it('vérifie le code OTP et renvoie un token', async () => {
    const user = await usersRepository.findOne({ where: { email } });
    expect(user?.otpCode).toBeTruthy();

    const response = await request(app.getHttpServer())
      .post('/api/auth/otp/verify')
      .send({ email, code: user!.otpCode })
      .expect(200);

    expect((response.body as AuthResponse).accessToken).toBeDefined();
  });

  it('se connecte une fois l’email vérifié', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    const body = response.body as AuthResponse;
    expect(body.accessToken).toBeDefined();
    // Le mot de passe hashé ne doit jamais fuiter dans la réponse (Lot 1).
    expect(body.user.password).toBeUndefined();
    accessToken = body.accessToken;
  });

  it('crée une commande sur place', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        serviceType: 'dine_in',
        tableNumber: 4,
        items: [{ menuItemId: menuItem.id, quantity: 2 }],
      })
      .expect(201);

    const body = response.body as OrderResponse;
    expect(body.subtotalAmount).toBe(5000);
    expect(body.status).toBe('pending');
  });

  it('retrouve la commande dans "mes commandes"', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/orders/my-orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as OrderResponse[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((order) => order.subtotalAmount === 5000)).toBe(true);
  });

  it("refuse l'accès aux commandes sans token", async () => {
    await request(app.getHttpServer()).get('/api/orders/my-orders').expect(401);
  });
});
