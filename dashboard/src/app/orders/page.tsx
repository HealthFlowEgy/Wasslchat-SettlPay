'use client';
import React, { useState } from 'react';

const statusColors: Record<string,string> = { PENDING:'bg-amber-100 text-amber-700', CONFIRMED:'bg-blue-100 text-blue-700', PROCESSING:'bg-purple-100 text-purple-700', SHIPPED:'bg-indigo-100 text-indigo-700', DELIVERED:'bg-green-100 text-green-700', CANCELLED:'bg-red-100 text-red-700' };
const statusAr: Record<string,string> = { PENDING:'معلّق', CONFIRMED:'مؤكد', PROCESSING:'قيد التجهيز', SHIPPED:'تم الشحن', DELIVERED:'تم التسليم', CANCELLED:'ملغي' };

const mockOrders = [
  { id:'1', number:'WC-A1B2', customer:'أحمد محمد', phone:'01012345678', total:450, status:'PENDING', payment:'FAWRY', paymentStatus:'PENDING', date:'منذ ٥ دقائق', items:1 },
  { id:'2', number:'WC-C3D4', customer:'سارة أحمد', phone:'01123456789', total:1380, status:'CONFIRMED', payment:'HEALTHPAY', paymentStatus:'COMPLETED', date:'منذ ساعة', items:3 },
  { id:'3', number:'WC-E5F6', customer:'محمد علي', phone:'01234567890', total:275, status:'SHIPPED', payment:'COD', paymentStatus:'PENDING', date:'أمس', items:2 },
  { id:'4', number:'WC-G7H8', customer:'فاطمة حسن', phone:'01098765432', total:180, status:'DELIVERED', payment:'VODAFONE_CASH', paymentStatus:'COMPLETED', date:'منذ ٣ أيام', items:1 },
  { id:'5', number:'WC-I9J0', customer:'عمر خالد', phone:'01198765432', total:950, status:'CANCELLED', payment:'FAWRY', paymentStatus:'FAILED', date:'منذ أسبوع', items:2 },
];

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const filtered = mockOrders.filter(o => statusFilter === 'all' || o.status === statusFilter);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">الطلبات</h1><p className="text-sm text-gray-500">{filtered.length} طلب</p></div>
        <button className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium">+ طلب جديد</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {['all','PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter===s?'bg-green-500 text-white':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{s==='all'?'الكل':statusAr[s]}</button>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-gray-100 bg-gray-50">{['رقم الطلب','العميل','المنتجات','الإجمالي','الدفع','الحالة','التاريخ',''].map((h,i)=><th key={i} className="px-4 py-3 text-right text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">{filtered.map(o=>(
            <tr key={o.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-mono text-gray-900">{o.number}</td>
              <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{o.customer}</p><p className="text-xs text-gray-400" dir="ltr">{o.phone}</p></td>
              <td className="px-4 py-3 text-sm text-gray-600">{o.items} منتج</td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{o.total} ج.م</td>
              <td className="px-4 py-3 text-xs text-gray-500">{o.payment.replace('_', ' ')}</td>
              <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[o.status]}`}>{statusAr[o.status]}</span></td>
              <td className="px-4 py-3 text-sm text-gray-400">{o.date}</td>
              <td className="px-4 py-3"><button className="text-sm text-green-600 hover:underline">تفاصيل</button></td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
