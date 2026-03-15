'use client';
import React from 'react';

const rules = [
  { id:'1', name:'ترحيب العميل الجديد', event:'contact.created', active:true, executions:450, conditions:'المصدر = واتساب', action:'إرسال رسالة ترحيب' },
  { id:'2', name:'تنبيه مخزون منخفض', event:'product.low_stock', active:true, executions:23, conditions:'المخزون < ٥', action:'إشعار المالك' },
  { id:'3', name:'متابعة بعد الشراء', event:'order.delivered', active:true, executions:180, conditions:'—', action:'إرسال رسالة شكر + طلب تقييم بعد ٢٤ ساعة' },
  { id:'4', name:'تصنيف العملاء VIP', event:'order.completed', active:false, executions:85, conditions:'إجمالي الإنفاق > ٥٠٠٠ ج.م', action:'إضافة تاج VIP' },
  { id:'5', name:'إعادة تفعيل العملاء', event:'schedule.daily', active:true, executions:12, conditions:'آخر طلب > ٣٠ يوم', action:'إرسال عرض خاص' },
];

const eventLabels: Record<string,string> = { 'contact.created':'عميل جديد', 'product.low_stock':'مخزون منخفض', 'order.delivered':'طلب تم تسليمه', 'order.completed':'طلب مكتمل', 'schedule.daily':'جدول يومي' };

export default function AutomationPage() {
  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">الأتمتة</h1><p className="text-sm text-gray-500">{rules.length} قاعدة</p></div>
        <button className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium">+ قاعدة جديدة</button>
      </div>
      <div className="grid gap-4">{rules.map(r => (
        <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${r.active ? 'bg-green-500' : 'bg-gray-300'}`} />
              <h3 className="font-semibold text-gray-900">{r.name}</h3>
              <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700">{eventLabels[r.event] || r.event}</span>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">تعديل</button>
              <button className={`px-3 py-1.5 rounded-lg text-sm font-medium ${r.active ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'bg-green-50 text-green-700'}`}>
                {r.active ? 'إيقاف' : 'تفعيل'}
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-400">الشرط: </span><span className="text-gray-700">{r.conditions}</span></div>
            <div><span className="text-gray-400">الإجراء: </span><span className="text-gray-700">{r.action}</span></div>
            <div><span className="text-gray-400">التنفيذات: </span><span className="font-medium text-gray-900">{r.executions}</span></div>
          </div>
        </div>
      ))}</div>
    </div>
  );
}
