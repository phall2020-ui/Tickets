import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../common/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CommentVisibility } from '@prisma/client';
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets/:ticketId/comments')
export class CommentsController {
  constructor(private svc: CommentsService) {}
  private tenant(req: any) { return req.user.tenantId; }
  private userId(req: any) { return req.user?.sub; }
  @Post()
  @Roles('AssetManager','OandM','Contractor')
  async add(@Req() req: any, @Param('ticketId') ticketId: string, @Body() dto: { body: string; visibility?: CommentVisibility }) {
    return this.svc.add(this.tenant(req), ticketId, this.userId(req), dto.body, dto.visibility ?? CommentVisibility.INTERNAL);
  }
  @Get()
  @Roles('AssetManager','OandM','Monitoring','Contractor')
  async list(@Req() req: any, @Param('ticketId') ticketId: string) {
    return this.svc.list(this.tenant(req), ticketId);
  }
}
