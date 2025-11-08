import { Module } from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
@Module({ controllers: [CommentsController], providers: [CommentsService, PrismaService] })
export class CommentsModule {}
