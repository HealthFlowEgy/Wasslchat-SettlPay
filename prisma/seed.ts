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

  // Demo coupons
  const coupons = await Promise.all([
    prisma.coupon.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'WELCOME10' } }, update: {}, create: { tenantId: tenant.id, code: 'WELCOME10', type: 'PERCENTAGE', value: 10, maxDiscount: 100, maxUses: 100, isActive: true } }),
    prisma.coupon.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'FREESHIP' } }, update: {}, create: { tenantId: tenant.id, code: 'FREESHIP', type: 'FREE_SHIPPING', value: 0, minOrderAmount: 200, isActive: true } }),
    prisma.coupon.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: 'SAVE50' } }, update: {}, create: { tenantId: tenant.id, code: 'SAVE50', type: 'FIXED_AMOUNT', value: 50, minOrderAmount: 300, maxUses: 50, isActive: true } }),
  ]);
  console.log(`✅ ${coupons.length} coupons created (WELCOME10, FREESHIP, SAVE50)`);

  // Demo WhatsApp templates
  await prisma.whatsappTemplate.upsert({
    where: { tenantId_name_language: { tenantId: tenant.id, name: 'order_confirmation', language: 'ar' } },
    update: {},
    create: { tenantId: tenant.id, name: 'order_confirmation', language: 'ar', category: 'UTILITY', body: 'مرحباً {{1}}! تم تأكيد طلبك رقم {{2}} بقيمة {{3}} ج.م. سيتم شحنه خلال {{4}}.', status: 'APPROVED' },
  });
  await prisma.whatsappTemplate.upsert({
    where: { tenantId_name_language: { tenantId: tenant.id, name: 'payment_reminder', language: 'ar' } },
    update: {},
    create: { tenantId: tenant.id, name: 'payment_reminder', language: 'ar', category: 'UTILITY', body: 'مرحباً {{1}}! طلبك رقم {{2}} في انتظار الدفع. المبلغ: {{3}} ج.م. ادفع الآن عبر فوري بالرقم المرجعي: {{4}}', status: 'APPROVED' },
  });
  console.log('✅ 2 WhatsApp templates created');

  // Demo quick replies
  await Promise.all([
    prisma.quickReply.upsert({ where: { tenantId_shortcut: { tenantId: tenant.id, shortcut: '/hello' } }, update: {}, create: { tenantId: tenant.id, shortcut: '/hello', content: 'أهلاً وسهلاً بيك! 🙌 كيف أقدر أساعدك؟', contentAr: 'أهلاً وسهلاً بيك! 🙌 كيف أقدر أساعدك؟', category: 'greeting' } }),
    prisma.quickReply.upsert({ where: { tenantId_shortcut: { tenantId: tenant.id, shortcut: '/hours' } }, update: {}, create: { tenantId: tenant.id, shortcut: '/hours', content: 'مواعيد العمل من ٩ صباحاً لـ ١٠ مساءً، كل أيام الأسبوع 🕐', contentAr: 'مواعيد العمل من ٩ صباحاً لـ ١٠ مساءً', category: 'info' } }),
    prisma.quickReply.upsert({ where: { tenantId_shortcut: { tenantId: tenant.id, shortcut: '/thanks' } }, update: {}, create: { tenantId: tenant.id, shortcut: '/thanks', content: 'شكراً لتسوقك معانا! 🙏 لو عندك أي سؤال تاني، أنا موجود', contentAr: 'شكراً لتسوقك معانا!', category: 'closing' } }),
    prisma.quickReply.upsert({ where: { tenantId_shortcut: { tenantId: tenant.id, shortcut: '/shipping' } }, update: {}, create: { tenantId: tenant.id, shortcut: '/shipping', content: 'التوصيل خلال ٢-٣ أيام عمل 📦\nالتكلفة: ٣٥ ج.م داخل القاهرة\n٥٠ ج.م للمحافظات', contentAr: 'التوصيل خلال ٢-٣ أيام عمل', category: 'info' } }),
  ]);
  console.log('✅ 4 quick replies created (/hello, /hours, /thanks, /shipping)');

  // Demo tags
  await Promise.all([
    prisma.tag.upsert({ where: { tenantId_name: { tenantId: tenant.id, name: 'VIP' } }, update: {}, create: { tenantId: tenant.id, name: 'VIP', nameAr: 'عميل مميز', color: '#f59e0b' } }),
    prisma.tag.upsert({ where: { tenantId_name: { tenantId: tenant.id, name: 'عميل متكرر' } }, update: {}, create: { tenantId: tenant.id, name: 'عميل متكرر', color: '#8b5cf6' } }),
    prisma.tag.upsert({ where: { tenantId_name: { tenantId: tenant.id, name: 'بالجملة' } }, update: {}, create: { tenantId: tenant.id, name: 'بالجملة', nameAr: 'بالجملة', color: '#3b82f6' } }),
  ]);
  console.log('✅ 3 tags created (VIP, عميل متكرر, بالجملة)');

  // Demo automation rules
  await prisma.automationRule.create({
    data: { tenantId: tenant.id, name: 'ترحيب العميل الجديد', event: 'contact.created', conditions: [{ field: 'source', operator: 'equals', value: 'WHATSAPP' }], actions: [{ type: 'send_message', template: '/hello' }], isActive: true },
  });
  await prisma.automationRule.create({
    data: { tenantId: tenant.id, name: 'تنبيه مخزون منخفض', event: 'product.low_stock', conditions: [], actions: [{ type: 'notify_owner', message: 'منتج وصل للحد الأدنى' }], isActive: true },
  });
  console.log('✅ 2 automation rules created');
