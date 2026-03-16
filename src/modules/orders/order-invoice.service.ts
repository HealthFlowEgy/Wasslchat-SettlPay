import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class OrderInvoiceService {
  constructor(private prisma: PrismaService) {}

  async generateInvoiceHtml(tenantId: string, orderId: string): Promise<string> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { contact: true, items: { include: { product: true } }, tenant: true },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');

    const items = order.items.map((item: any) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${item.nameAr || item.name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:left">${item.unitPrice.toLocaleString()} ج.م</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:left">${item.totalPrice.toLocaleString()} ج.م</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><style>
  body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 20px; color: #333; direction: rtl; }
  .invoice { max-width: 700px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
  .header { background: #16a34a; color: white; padding: 24px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { margin: 0; font-size: 24px; }
  .header .invoice-no { font-size: 14px; opacity: 0.9; }
  .body { padding: 24px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .info-box h3 { margin: 0 0 8px; font-size: 13px; color: #6b7280; text-transform: uppercase; }
  .info-box p { margin: 2px 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f9fafb; padding: 10px 8px; text-align: right; font-size: 12px; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
  .totals { text-align: left; }
  .totals td { padding: 6px 8px; font-size: 14px; }
  .totals .grand { font-size: 18px; font-weight: bold; color: #16a34a; border-top: 2px solid #16a34a; }
  .footer { text-align: center; padding: 16px; background: #f9fafb; font-size: 12px; color: #9ca3af; }
</style></head>
<body><div class="invoice">
  <div class="header">
    <div><h1>${order.tenant.nameAr || order.tenant.name}</h1><p style="margin:4px 0 0;font-size:13px;opacity:0.8">فاتورة ضريبية مبسطة</p></div>
    <div style="text-align:left"><div class="invoice-no">فاتورة رقم</div><div style="font-size:20px;font-weight:bold">${order.orderNumber}</div><div style="font-size:12px;opacity:0.8">${new Date(order.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</div></div>
  </div>
  <div class="body">
    <div class="info-grid">
      <div class="info-box"><h3>العميل</h3><p><strong>${order.contact.nameAr || order.contact.name || '-'}</strong></p><p>${order.contact.phone}</p>${order.contact.email ? `<p>${order.contact.email}</p>` : ''}</div>
      <div class="info-box"><h3>المتجر</h3><p><strong>${order.tenant.nameAr || order.tenant.name}</strong></p>${order.tenant.phone ? `<p>${order.tenant.phone}</p>` : ''}${order.tenant.email ? `<p>${order.tenant.email}</p>` : ''}</div>
    </div>
    <table>
      <thead><tr><th>المنتج</th><th style="text-align:center">الكمية</th><th style="text-align:left">سعر الوحدة</th><th style="text-align:left">الإجمالي</th></tr></thead>
      <tbody>${items}</tbody>
    </table>
    <table class="totals" style="width:250px;margin-right:0;margin-left:auto">
      <tr><td style="color:#6b7280">المجموع الفرعي</td><td>${order.subtotal.toLocaleString()} ج.م</td></tr>
      ${order.discount > 0 ? `<tr><td style="color:#6b7280">الخصم</td><td style="color:#dc2626">-${order.discount.toLocaleString()} ج.م</td></tr>` : ''}
      ${order.shippingCost > 0 ? `<tr><td style="color:#6b7280">الشحن</td><td>${order.shippingCost.toLocaleString()} ج.م</td></tr>` : ''}
      <tr class="grand"><td>الإجمالي</td><td>${order.total.toLocaleString()} ج.م</td></tr>
    </table>
    <div style="margin-top:20px;padding:12px;background:#f0fdf4;border-radius:8px;font-size:13px">
      <strong>حالة الدفع:</strong> ${order.paymentStatus === 'COMPLETED' ? '✅ مدفوع' : '⏳ معلّق'} · 
      <strong>طريقة الدفع:</strong> ${order.paymentMethod || 'غير محدد'}
    </div>
    ${order.customerNotes ? `<div style="margin-top:12px;padding:12px;background:#fffbeb;border-radius:8px;font-size:13px"><strong>ملاحظات العميل:</strong> ${order.customerNotes}</div>` : ''}
  </div>
  <div class="footer">تم إنشاء هذه الفاتورة تلقائياً بواسطة WasslChat · ${new Date().toISOString().split('T')[0]}</div>
</div></body></html>`;
  }
}
