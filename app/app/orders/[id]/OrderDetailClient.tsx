"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "../../lib/apiClient";

type Grade = "A" | "B" | "C" | "D";

type GradeRequest = {
  grade: Grade;
  price: number;
  quantity: string;
  total: number;
};

type CategoryRequest = {
  categoryID: string;
  subCategoryID: string;
  requestList?: GradeRequest[];
};

type TransactionParty = {
  roleName?: string;
  name?: string;
  id?: string;
};

type Order = {
  _id?: { $oid: string };
  orderId: string;
  orderFinishedDate?: string;
  orderFinishedTime?: string;
  orderType?: string;
  requestList?: CategoryRequest[];
  transactionParties?: {
    customer?: TransactionParty;
    transport?: TransactionParty;
    collector?: TransactionParty;
  };
};

const formatCurrency = (value: number) =>
  value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getOverallTotal = (order: Order | null) =>
  (order?.requestList ?? []).reduce((sum, cat) => {
    const catTotal = (cat.requestList ?? []).reduce(
      (inner, item) => inner + (item.total || 0),
      0,
    );
    return sum + catTotal;
  }, 0);

const getFlattenedRows = (order: Order | null) =>
  (order?.requestList ?? []).flatMap((cat) =>
    (cat.requestList ?? []).map((item, idx) => ({
      key: `${cat.categoryID}-${cat.subCategoryID}-${idx}`,
      categoryID: cat.categoryID,
      subCategoryID: cat.subCategoryID,
      grade: item.grade,
      price: item.price,
      quantity: item.quantity,
      total: item.total,
    })),
  );

type Props = {
  id: string;
};

export function OrderDetailClient({ id }: Props) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchOrder = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await apiClient.get<{
          buyTransaction: Order[];
          sellTransaction: Order[];
        }>("/Stock/query-transaction-demo");

        const allOrders = res.data?.buyTransaction ?? [];
        const found =
          allOrders.find((o) => String(o.orderId) === String(id)) ?? null;

        if (!active) return;

        if (!found) {
          setOrder(null);
          setError("ไม่พบออเดอร์ตามรหัสที่ระบุ");
        } else {
          setOrder(found);
        }
      } catch (e) {
        console.error("Failed to fetch order detail", e);
        if (!active) return;
        setOrder(null);
        setError("ไม่สามารถโหลดข้อมูลออเดอร์ได้");
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchOrder();

    return () => {
      active = false;
    };
  }, [id]);

  const overallTotal = getOverallTotal(order);
  const flattenedRows = getFlattenedRows(order);

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            ดูรายละเอียดออเดอร์
          </h1>
          <p className="mt-1 text-sm text-gray-600">รหัสออเดอร์: {id}</p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          ย้อนกลับ
        </button>
      </div>

      {loading && !order && !error && (
        <div className="rounded-md bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
          กำลังโหลดข้อมูลออเดอร์...
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {!error && !order && !loading && (
        <div className="rounded-md bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
          ไม่พบข้อมูลออเดอร์
        </div>
      )}

      {!error && order && (
        <>
          <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs font-medium uppercase text-gray-500">
                Order ID
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {order.orderId ?? "-"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-gray-500">
                วันที่ทำรายการ
              </div>
              <div className="text-sm text-gray-900">
                {[order.orderFinishedDate ?? "-", order.orderFinishedTime ?? ""]
                  .filter(Boolean)
                  .join(" ")}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-gray-500">
                ประเภทออเดอร์
              </div>
              <div className="text-sm text-gray-900">
                {order.orderType === "buy"
                  ? "ซื้อ"
                  : order.orderType === "sell"
                    ? "ขาย"
                    : (order.orderType ?? "-")}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-gray-500">
                รวมยอดทั้งหมด
              </div>
              <div className="text-sm font-semibold text-gray-900">
                ฿{formatCurrency(overallTotal)}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-600">
              รายละเอียด
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-md border border-gray-100 bg-gray-50/50 p-3">
                <div className="text-xs font-medium uppercase text-gray-500">
                  {order.transactionParties?.customer?.roleName ?? "ผู้ขาย"}
                </div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {order.transactionParties?.customer?.name ?? "-"}
                </div>
                {order.transactionParties?.customer?.id && (
                  <div className="mt-0.5 font-mono text-xs text-gray-500">
                    {order.transactionParties.customer.id}
                  </div>
                )}
              </div>
              <div className="rounded-md border border-gray-100 bg-gray-50/50 p-3">
                <div className="text-xs font-medium uppercase text-gray-500">
                  {order.transactionParties?.transport?.roleName ??
                    "ผู้จัดโปรโมชั่น"}
                </div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {order.transactionParties?.transport?.name ?? "-"}
                </div>
                {order.transactionParties?.transport?.id && (
                  <div className="mt-0.5 font-mono text-xs text-gray-500">
                    {order.transactionParties.transport.id}
                  </div>
                )}
              </div>
              <div className="rounded-md border border-gray-100 bg-gray-50/50 p-3">
                <div className="text-xs font-medium uppercase text-gray-500">
                  {order.transactionParties?.collector?.roleName ??
                    "สถานที่ลงสินค้าหรือผู้รับซื้อ"}
                </div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {order.transactionParties?.collector?.name ?? "-"}
                </div>
                {order.transactionParties?.collector?.id && (
                  <div className="mt-0.5 font-mono text-xs text-gray-500">
                    {order.transactionParties.collector.id}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">
                รายการสินค้า
              </h2>
            </div>
            {flattenedRows.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-600">
                ไม่มีรายละเอียดรายการในออเดอร์นี้
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      หมวดหมู่
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      ย่อย
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      เกรด
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      ราคา
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      จำนวน
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      รวม
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {flattenedRows.map((row) => (
                    <tr key={row.key}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                        {row.categoryID}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                        {row.subCategoryID}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                        {row.grade}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                        ฿{formatCurrency(row.price)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                        {row.quantity}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900">
                        ฿{formatCurrency(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
