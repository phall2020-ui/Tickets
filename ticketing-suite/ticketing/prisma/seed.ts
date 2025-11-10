// prisma/seed.ts
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Only seed if no users exist
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log('Seed skipped: users already exist.');
    return;
  }

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant-001' },
    update: {},
    create: { id: 'tenant-001', name: 'Default Tenant' },
  });

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      id: 'admin-001',
      tenantId: tenant.id,
      email: 'admin@example.com',
      name: 'Admin User',
      // bcrypt hash for: Admin123!
      passwordHash: '$2b$10$kH2pLk9hZl5xQGg7n8lE0u5hBf7mEw5eHqO5y7pD1v5C4mQ0u5uY6',
      role: 'ADMIN',
      isActive: true,
    },
  });

  // Create standard user
  const user = await prisma.user.create({
    data: {
      id: 'user-001',
      tenantId: tenant.id,
      email: 'user@example.com',
      name: 'Standard User',
      // bcrypt hash for: User123!
      passwordHash: '$2b$10$w4kO2w8E7zLZCzV5VQv0UuB4nB1iF2eD0pT3yH7rXqYyZl9JrVt7a',
      role: 'USER',
      isActive: true,
    },
  });

  console.log('Seed complete:', { tenant: tenant.id, admin: admin.email, user: user.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
