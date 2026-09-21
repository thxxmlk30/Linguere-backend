import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateDeliveryZoneDto } from './create-delivery-zone.dto';

// `id` est la clé primaire : elle ne doit jamais pouvoir être réécrite via
// un PUT/PATCH (sinon un body avec un autre id pourrait corrompre la ligne).
export class UpdateDeliveryZoneDto extends PartialType(
  OmitType(CreateDeliveryZoneDto, ['id'] as const),
) {}
