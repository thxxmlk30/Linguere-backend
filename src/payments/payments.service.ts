import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Order } from '../orders/entities/order.entity';
import { Role } from '../common/enums/role.enum';
import { OrderStatus } from '../common/enums/order-status.enum';

interface AuthUser {
  id: string;
  role: Role;
}

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe | null;

  constructor(
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    private configService: ConfigService,
  ) {
    const secretKey = this.configService
      .get<string>('STRIPE_SECRET_KEY')
      ?.trim();
    this.stripe = secretKey ? new Stripe(secretKey) : null;
  }

  async createStripeCheckout(orderId: string, user: AuthUser) {
    const order = await this.findAccessibleOrder(orderId, user);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Impossible de payer une commande annulee');
    }

    order.paymentStatus = 'pending';
    order.paymentProvider = 'stripe';
    await this.ordersRepository.save(order);

    if (!this.stripe) {
      const checkoutUrl = this.buildFrontendUrl(
        `/payment/stripe/success?orderId=${order.id}&session_id=sim_${order.id}&simulated=1`,
      );
      order.paymentSessionId = `sim_${order.id}`;
      await this.ordersRepository.save(order);
      return {
        provider: 'simulation',
        sessionId: order.paymentSessionId,
        checkoutUrl,
        paymentStatus: order.paymentStatus,
      };
    }

    const successUrl = this.buildFrontendUrl(
      `/payment/stripe/success?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
    );
    const cancelUrl = this.buildFrontendUrl(
      `/payment/stripe/cancel?orderId=${order.id}`,
    );

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: order.user?.email,
      metadata: {
        orderId: order.id,
        userId: order.userId,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: this.getCurrency(),
            unit_amount: Math.round(Number(order.totalAmount) * 100),
            product_data: {
              name: `Commande Linguere #${order.id.slice(0, 8)}`,
              description: `${order.items.length} article(s)`,
            },
          },
        },
      ],
    });

    order.paymentSessionId = session.id;
    await this.ordersRepository.save(order);

    return {
      provider: 'stripe',
      sessionId: session.id,
      checkoutUrl: session.url,
      paymentStatus: order.paymentStatus,
    };
  }

  async confirmStripePayment(
    orderId: string,
    user: AuthUser,
    sessionId: string,
  ) {
    const order = await this.findAccessibleOrder(orderId, user);

    if (sessionId.startsWith('sim_')) {
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
      order.paymentSessionId = sessionId;
      order.paymentIntentId = null;
      await this.ordersRepository.save(order);
      return this.toResponse(order);
    }

    if (!this.stripe) {
      throw new BadRequestException('Stripe n est pas configure');
    }

    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      throw new BadRequestException('Paiement non valide ou incomplet');
    }

    order.paymentStatus = 'paid';
    order.paidAt = new Date();
    order.paymentSessionId = session.id;
    order.paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);
    await this.ordersRepository.save(order);

    return this.toResponse(order);
  }

  private async findAccessibleOrder(orderId: string, user: AuthUser) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: { user: true },
    });

    if (!order) {
      throw new NotFoundException(`Commande introuvable (id: ${orderId})`);
    }

    if (user.role !== Role.ADMIN && order.userId !== user.id) {
      throw new ForbiddenException("Vous n'avez pas acces a cette commande");
    }

    return order;
  }

  private buildFrontendUrl(path: string) {
    const frontendUrl = this.configService
      .get<string>('FRONTEND_URL', 'http://localhost:5173')
      .replace(/\/$/, '');
    return `${frontendUrl}${path}`;
  }

  private getCurrency() {
    return (
      this.configService.get<string>('STRIPE_CURRENCY', 'eur') || 'eur'
    ).toLowerCase();
  }

  private toResponse(order: Order) {
    return {
      id: order.id,
      paymentStatus: order.paymentStatus,
      paymentProvider: order.paymentProvider ?? undefined,
      paymentSessionId: order.paymentSessionId ?? undefined,
      paymentIntentId: order.paymentIntentId ?? undefined,
      paidAt: order.paidAt ? order.paidAt.toISOString() : undefined,
    };
  }
}
