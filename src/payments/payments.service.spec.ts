import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Order } from '../orders/entities/order.entity';
import { Role } from '../common/enums/role.enum';
import { OrderStatus } from '../common/enums/order-status.enum';

const mockStripeInstance = {
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripeInstance);
});

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockOrdersRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
      return fallback;
    }),
  };

  const adminUser = { id: 'admin-1', role: Role.ADMIN };
  const clientUser = { id: 'client-1', role: Role.CLIENT };

  function buildOrder(overrides: Partial<Order> = {}): Order {
    return {
      id: 'order-1',
      userId: 'client-1',
      user: { id: 'client-1', email: 'client@linguere.sn' } as Order['user'],
      items: [],
      serviceType: 'dine_in',
      tableNumber: null,
      deliveryZoneId: null,
      deliveryAddress: null,
      deliveryNotes: null,
      deliveryFee: 0,
      subtotalAmount: 5000,
      customerName: null,
      customerPhone: null,
      assignedChefId: null,
      assignedChefName: null,
      courierId: null,
      courierName: null,
      totalAmount: 5000,
      paymentStatus: 'unpaid',
      paymentProvider: null,
      paymentSessionId: null,
      paymentIntentId: null,
      paidAt: null,
      rating: null,
      review: null,
      ratedAt: null,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Order), useValue: mockOrdersRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('createStripeCheckout', () => {
    it('refuse une commande annulée', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ status: OrderStatus.CANCELLED }),
      );

      await expect(
        service.createStripeCheckout('order-1', clientUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuse un montant nul ou invalide', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ totalAmount: 0 }),
      );

      await expect(
        service.createStripeCheckout('order-1', clientUser),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuse l'accès à la commande d'un autre client (IDOR)", async () => {
      mockOrdersRepository.findOne.mockResolvedValue(
        buildOrder({ userId: 'un-autre-client' }),
      );

      await expect(
        service.createStripeCheckout('order-1', clientUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('crée une session Stripe pour une commande valide', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(buildOrder());
      mockOrdersRepository.save.mockImplementation((o: Order) => o);
      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_1',
        url: 'https://checkout.stripe.com/cs_test_1',
      });

      const result = await service.createStripeCheckout('order-1', clientUser);

      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/cs_test_1');
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalled();
    });
  });

  describe('confirmStripePayment', () => {
    it('refuse un paiement Stripe non "paid"', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(buildOrder());
      mockStripeInstance.checkout.sessions.retrieve.mockResolvedValue({
        payment_status: 'unpaid',
      });

      await expect(
        service.confirmStripePayment('order-1', clientUser, 'cs_test_1'),
      ).rejects.toThrow(BadRequestException);
    });

    it(
      'refuse la confirmation si la session Stripe appartient à une autre ' +
        'commande (non-régression : contournement de paiement)',
      async () => {
        mockOrdersRepository.findOne.mockResolvedValue(buildOrder());
        mockStripeInstance.checkout.sessions.retrieve.mockResolvedValue({
          id: 'cs_test_1',
          payment_status: 'paid',
          amount_total: 5000,
          metadata: { orderId: 'une-autre-commande-bon-marche' },
        });

        await expect(
          service.confirmStripePayment('order-1', clientUser, 'cs_test_1'),
        ).rejects.toThrow(BadRequestException);
        expect(mockOrdersRepository.save).not.toHaveBeenCalledWith(
          expect.objectContaining({ paymentStatus: 'paid' }),
        );
      },
    );

    it('refuse la confirmation si le montant payé ne correspond pas', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(buildOrder());
      mockStripeInstance.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_test_1',
        payment_status: 'paid',
        amount_total: 1, // trop faible par rapport aux 5000 dus
        metadata: { orderId: 'order-1' },
      });

      await expect(
        service.confirmStripePayment('order-1', clientUser, 'cs_test_1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('marque la commande payée quand tout correspond', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(buildOrder());
      mockOrdersRepository.save.mockImplementation((o: Order) => o);
      mockStripeInstance.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_test_1',
        payment_status: 'paid',
        amount_total: 5000,
        metadata: { orderId: 'order-1' },
        payment_intent: 'pi_test_1',
      });

      const result = await service.confirmStripePayment(
        'order-1',
        clientUser,
        'cs_test_1',
      );

      expect(result.paymentStatus).toBe('paid');
    });

    it('gère proprement une panne Stripe lors de la récupération de session', async () => {
      mockOrdersRepository.findOne.mockResolvedValue(buildOrder());
      mockStripeInstance.checkout.sessions.retrieve.mockRejectedValue(
        new Error('Stripe indisponible'),
      );

      await expect(
        service.confirmStripePayment('order-1', clientUser, 'cs_test_1'),
      ).rejects.toThrow(BadRequestException);
    });

    it("un admin peut confirmer le paiement d'une commande d'un autre utilisateur", async () => {
      mockOrdersRepository.findOne.mockResolvedValue(buildOrder());
      mockOrdersRepository.save.mockImplementation((o: Order) => o);
      mockStripeInstance.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_test_1',
        payment_status: 'paid',
        amount_total: 5000,
        metadata: { orderId: 'order-1' },
      });

      const result = await service.confirmStripePayment(
        'order-1',
        adminUser,
        'cs_test_1',
      );

      expect(result.paymentStatus).toBe('paid');
    });
  });
});
