import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding WasslChat database...');

  // Plans
  const plans = await Promise.all([
    prisma.plan.upsert({ where: { slug: 'starter' }, update: {}, create: { name: 'Starter', nameAr: 'المبتدئ', slug: 'starter', priceMonthly: 499, priceYearly: 4990, maxConversations: 500, maxTeamMembers: 2, maxProducts: 100, maxBroadcastsPerMonth: 5, maxContacts: 500, features: { whatsapp: true, catalog: true, orders: true, basicAnalytics: true }, sortOrder: 1 } }),
    prisma.plan.upsert({ where: { slug: 'growth' }, update: {}, create: { name: 'Growth', nameAr: 'النمو', slug: 'growth', priceMonthly: 999, priceYearly: 9990, maxConversations: 2000, maxTeamMembers: 5, maxProducts: 500, maxBroadcastsPerMonth: 20, maxContacts: 2000, features: { whatsapp: true, catalog: true, orders: true, payments: true, chatbot: true, analytics: true, broadcasts: true }, sortOrder: 2 } }),
    prisma.plan.upsert({ where: { slug: 'business' }, update: {}, create: { name: 'Business', nameAr: 'الأعمال', slug: 'business', priceMonthly: 1999, priceYearly: 19990, maxConversations: 5000, maxTeamMembers: 10, maxProducts: -1, maxBroadcastsPerMonth: 100, maxContacts: 10000, features: { whatsapp: true, catalog: true, orders: true, payments: true, chatbot: true, analytics: true, broadcasts: true, automation: true, integrations: true, ai: true }, sortOrder: 3 } }),
    prisma.plan.upsert({ where: { slug: 'enterprise' }, update: {}, create: { name: 'Enterprise', nameAr: 'المؤسسات', slug: 'enterprise', priceMonthly: 0, priceYearly: 0, maxConversations: -1, maxTeamMembers: -1, maxProducts: -1, maxBroadcastsPerMonth: -1, maxContacts: -1, features: { whatsapp: true, catalog: true, orders: true, payments: true, chatbot: true, analytics: true, broadcasts: true, automation: true, integrations: true, ai: true, whiteLabel: true, dedicatedSupport: true, customDomain: true }, sortOrder: 4 } }),
  ]);
  console.log(`✅ ${plans.length} plans created`);

  // Demo tenant
  const passwordHash = await bcrypt.hash('demo2026', 12);
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-store' },
    update: {},
    create: {
      name: 'Demo Store', nameAr: 'متجر تجريبي', slug: 'demo-store', email: 'demo@wasslchat.com', phone: '01012345678',
      planId: plans[1].id, status: 'ACTIVE', businessType: 'retail',
      settings: { currency: 'EGP', language: 'ar', timezone: 'Africa/Cairo', workingHours: { start: '09:00', end: '22:00' } },
      users: { create: { email: 'demo@wasslchat.com', passwordHash, firstName: 'Ahmed', lastName: 'Demo', firstNameAr: 'أحمد', lastNameAr: 'تجريبي', phone: '01012345678', role: 'OWNER' } },
    },
  });
  console.log(`✅ Demo tenant: ${tenant.name} (${tenant.slug})`);

  // Demo categories
  const cats = await Promise.all([
    prisma.category.upsert({ where: { tenantId_slug: { tenantId: tenant.id, slug: 'electronics' } }, update: {}, create: { tenantId: tenant.id, name: 'Electronics', nameAr: 'إلكترونيات', slug: 'electronics', sortOrder: 1 } }),
    prisma.category.upsert({ where: { tenantId_slug: { tenantId: tenant.id, slug: 'fashion' } }, update: {}, create: { tenantId: tenant.id, name: 'Fashion', nameAr: 'أزياء', slug: 'fashion', sortOrder: 2 } }),
    prisma.category.upsert({ where: { tenantId_slug: { tenantId: tenant.id, slug: 'health' } }, update: {}, create: { tenantId: tenant.id, name: 'Health & Beauty', nameAr: 'صحة وجمال', slug: 'health', sortOrder: 3 } }),
  ]);
  console.log(`✅ ${cats.length} categories created`);

  // Demo products
  const products = [
    { name: 'Wireless Earbuds', nameAr: 'سماعات لاسلكية', price: 450, sku: 'WE-001', categoryId: cats[0].id, inventoryQuantity: 50, isFeatured: true },
    { name: 'Smart Watch', nameAr: 'ساعة ذكية', price: 1200, sku: 'SW-001', categoryId: cats[0].id, inventoryQuantity: 30 },
    { name: 'Cotton T-Shirt', nameAr: 'تي شيرت قطن', price: 180, sku: 'TS-001', categoryId: cats[1].id, inventoryQuantity: 100, isFeatured: true },
    { name: 'Face Cream', nameAr: 'كريم وجه', price: 95, sku: 'FC-001', categoryId: cats[2].id, inventoryQuantity: 75 },
    { name: 'Vitamin C Serum', nameAr: 'سيروم فيتامين سي', price: 250, sku: 'VC-001', categoryId: cats[2].id, inventoryQuantity: 40 },
  ];
  for (const p of products) {
    await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: p.sku } },
      update: {},
      create: { ...p, tenantId: tenant.id, slug: p.sku.toLowerCase() + '-' + Date.now().toString(36), currency: 'EGP' },
    });
  }
  console.log(`✅ ${products.length} products created`);

  console.log('\n🎉 Seed completed!\n');
  console.log('Login: demo@wasslchat.com / demo2026');
}

main().catch(console.error).finally(() => prisma.$disconnect());
