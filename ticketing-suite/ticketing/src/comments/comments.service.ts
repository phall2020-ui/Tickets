import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { CommentVisibility } from '@prisma/client';
@Injectable() export class CommentsService {
  constructor(private prisma: PrismaService) {}
  async add(tenantId: string, ticketId: string, authorUserId: string | undefined, body: string, visibility: CommentVisibility) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const exists = await tx.ticket.findFirst({ where: { id: ticketId, tenantId }});
      if (!exists) throw new BadRequestException('Invalid ticket');
      const c = await tx.comment.create({ data: { tenantId, ticketId, authorUserId: authorUserId ?? null, body, visibility } });
      await tx.outbox.create({ data: { tenantId, type: 'comment.created', entityId: c.id, payload: { ticketId, visibility } }});
      return c;
    });
  }
  async list(tenantId: string, ticketId: string) {
    return this.prisma.withTenant(tenantId, (tx) => tx.comment.findMany({ where: { tenantId, ticketId }, orderBy: { createdAt: 'asc' } }));
  }
}
