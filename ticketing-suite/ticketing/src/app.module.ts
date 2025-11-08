import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './infra/prisma.service';
import { AuthModule } from './auth/auth.module';
import { TicketsModule } from './tickets/tickets.module';
import { CommentsModule } from './comments/comments.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60, limit: 120 }]),
    AuthModule,
    TicketsModule,
    CommentsModule,
    AttachmentsModule,
    HealthModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
