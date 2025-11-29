import { PrismaClient, Role, SiteType, ContractStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Default SPVs
const defaultSpvs = [
  { code: 'OS2', name: 'Olympus Solar 2 Ltd' },
  { code: 'AD1', name: 'AMPYR Distributed Energy 1 Ltd' },
  { code: 'FS', name: 'Fylde Solar Ltd' },
  { code: 'ESI8', name: 'Eden Sustainable Investments 8 Ltd' },
  { code: 'ESI1', name: 'Eden Sustainable Investments 1 Ltd' },
  { code: 'ESI10', name: 'Eden Sustainable Investments 10 Ltd' },
  { code: 'UV1', name: 'ULTRAVOLT SPV1 LIMITED' },
  { code: 'SKY', name: 'Skylight Energy Ltd' },
];

// Default rate tiers
const defaultRateTiers = [
  { tierName: '<20MW', minCapacityMW: 0, maxCapacityMW: 20, ratePerKwp: 2.0 },
  { tierName: '20-30MW', minCapacityMW: 20, maxCapacityMW: 30, ratePerKwp: 1.8 },
  { tierName: '30-40MW', minCapacityMW: 30, maxCapacityMW: 40, ratePerKwp: 1.7 },
];

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@clearsol.co.uk' },
    update: {},
    create: {
      email: 'admin@clearsol.co.uk',
      name: 'Admin User',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create SPVs
  for (const spv of defaultSpvs) {
    await prisma.sPV.upsert({
      where: { code: spv.code },
      update: { name: spv.name },
      create: spv,
    });
  }
  console.log(`✅ Created ${defaultSpvs.length} SPVs`);

  // Create rate tiers
  for (const tier of defaultRateTiers) {
    const existing = await prisma.rateTier.findFirst({
      where: { tierName: tier.tierName, isActive: true },
    });
    if (!existing) {
      await prisma.rateTier.create({ data: tier });
    }
  }
  console.log(`✅ Created ${defaultRateTiers.length} rate tiers`);

  // Import existing sites from JSON if available
  const sitesJsonPath = path.join(process.cwd(), 'src/data/sites.json');
  if (fs.existsSync(sitesJsonPath)) {
    const sitesData = JSON.parse(fs.readFileSync(sitesJsonPath, 'utf-8'));
    
    if (sitesData.length > 0) {
      console.log(`📥 Found ${sitesData.length} sites in JSON, migrating...`);
      
      for (const site of sitesData) {
        // Find SPV by code
        let spvId: string | null = null;
        if (site.spvCode) {
          const spv = await prisma.sPV.findUnique({ where: { code: site.spvCode } });
          spvId = spv?.id || null;
        }

        await prisma.site.upsert({
          where: { id: site.id },
          update: {
            name: site.name,
            systemSizeKwp: site.systemSizeKwp,
            siteType: site.siteType === 'Ground Mount' ? SiteType.GROUND_MOUNT : SiteType.ROOFTOP,
            contractStatus: site.contractStatus === 'Yes' ? ContractStatus.YES : ContractStatus.NO,
            onboardDate: site.onboardDate ? new Date(site.onboardDate) : null,
            pmCost: site.pmCost || 0,
            cctvCost: site.cctvCost || 0,
            cleaningCost: site.cleaningCost || 0,
            spvId,
            sourceSheet: site.sourceSheet,
            sourceRow: site.sourceRow,
          },
          create: {
            id: site.id,
            name: site.name,
            systemSizeKwp: site.systemSizeKwp,
            siteType: site.siteType === 'Ground Mount' ? SiteType.GROUND_MOUNT : SiteType.ROOFTOP,
            contractStatus: site.contractStatus === 'Yes' ? ContractStatus.YES : ContractStatus.NO,
            onboardDate: site.onboardDate ? new Date(site.onboardDate) : null,
            pmCost: site.pmCost || 0,
            cctvCost: site.cctvCost || 0,
            cleaningCost: site.cleaningCost || 0,
            spvId,
            sourceSheet: site.sourceSheet,
            sourceRow: site.sourceRow,
          },
        });
      }
      console.log(`✅ Migrated ${sitesData.length} sites from JSON`);
    }
  }

  console.log('🎉 Database seed completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

