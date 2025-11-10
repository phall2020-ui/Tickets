import { ArrayNotEmpty, IsArray, IsEnum, IsISO8601, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class BulkUpdateTicketsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  ids!: string[];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  @IsUUID()
  assignedUserId?: string | null;

  @IsOptional()
  @IsISO8601()
  dueAt?: string | null;
}

