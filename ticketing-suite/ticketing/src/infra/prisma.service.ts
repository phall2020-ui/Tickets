import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    console.log('🔧 [Prisma] Connecting to database...');
    const connectStart = Date.now();
    
    try {
      // Add timeout to prevent hanging indefinitely
      const connectPromise = this.$connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout after 10s')), 10000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      const connectTime = Date.now() - connectStart;
      console.log(`✅ [Prisma] Database connected (${connectTime}ms)`);
    } catch (error) {
      console.error('❌ [Prisma] Database connection failed:', error);
      throw error; // Re-throw to prevent app from starting with broken DB
    }
  }
  
  async onModuleDestroy() {
    console.log('🔧 [Prisma] Disconnecting from database...');
    await this.$disconnect();
    console.log('✅ [Prisma] Database disconnected');
  }

  async withTenant<T>(tenantId: string, fn: (tx: any) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });
  }
}
