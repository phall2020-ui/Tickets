import { IsUUID, IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { TicketStatus, TicketPriority } from '@prisma/client';
export class CreateTicketDto {
  @IsUUID() siteId!: string;
  @IsString() type!: string;
  @IsString() description!: string;
  @IsEnum(TicketStatus) status!: TicketStatus;
  @IsEnum(TicketPriority) priority!: TicketPriority;
  @IsOptional() @IsString() details?: string;
  @IsOptional() @IsString() assignedUserId?: string;
  @IsOptional() @IsObject() custom_fields?: Record<string, unknown>;
}
