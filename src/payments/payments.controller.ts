import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { PaymentsService } from './payments.service';

interface RequestUser {
  id: string;
  role: Role;
}

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:id/stripe-session')
  @ApiOperation({
    summary: 'Creer une session de paiement Stripe pour une commande',
  })
  createStripeSession(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.paymentsService.createStripeCheckout(id, user);
  }

  @Post('orders/:id/stripe-confirm')
  @ApiOperation({ summary: 'Confirmer le paiement Stripe d une commande' })
  confirmStripePayment(
    @Param('id') id: string,
    @Body() body: { sessionId: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.paymentsService.confirmStripePayment(id, user, body.sessionId);
  }
}
