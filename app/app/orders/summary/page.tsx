"use client";

import { useCallback, useEffect, useState } from "react";
import {
  OrderFilters,
  type OrderFiltersValue,
} from "../../components/SearchInput";
import { apiClient } from "../../lib/apiClient";

type CategoryOption = { id: string; name: string };
type SubCategoryOption = { id: string; name: string; categoryId: string };

type SideMetrics = {
  quantityKg: number;
  amount: number;
  minPrice: number | null;
  maxPrice: number | null;
  gradeAQtyKg: number;
  gradeBQtyKg: number;
  gradeCQtyKg: number;
  gradeDQtyKg: number;
  orderIds: string[];
};

type SummaryRow = {
  categoryId: string;
  categoryName: string | null;
  subCategoryId: string;
  subCategoryName: string | null;
  buy: SideMetrics;
  sell: SideMetrics;
  remainQuantityKg: number;
  remainAmount: number;
};

type SummaryResponse = {
  rows: SummaryRow[];
  totals: {
    buyQuantityKg: number;
    sellQuantityKg: number;
    remainQuantityKg: number;
    buyAmount: number;
    sellAmount: number;
    remainAmount: number;
  };
};

const defaultFilters: OrderFiltersValue = {
  dateFrom: "",
  dateTo: "",
  orderType: "",
  categoryId: "",
  subCategoryId: "",
  orderId: "",
  orderIdMatchMode: "contains",
  priceMin: "",
  priceMax: "",
  grade: "ALL",
};

function buildSummaryParams(
  filters: OrderFiltersValue,
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    orderIdMatchMode: filters.orderIdMatchMode,
    grade: filters.grade,
  };
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.orderType) params.orderType = filters.orderType;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.subCategoryId) params.subCategoryId = filters.subCategoryId;
  if (filters.orderId) params.orderId = filters.orderId;
  if (filters.priceMin) params.priceMin = filters.priceMin;
  if (filters.priceMax) params.priceMax = filters.priceMax;
  return params;
}

const formatNumber = (value: number, fractionDigits = 2) =>
  value.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

export default function OrderSummaryPage() {
  const [filters, setFilters] = useState<OrderFiltersValue>(defaultFilters);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryOption[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async (f: OrderFiltersValue) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildSummaryParams(f);
      const res = await apiClient.get<SummaryResponse>("/order/summary", {
        params,
      });
      setSummary(res.data);
    } catch (e) {
      console.error("Failed to fetch summary", e);
      setError("ไม่สามารถโหลดข้อมูลสรุปได้");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategoryOptions = useCallback(async () => {
    try {
      const res =
        await apiClient.get<{ categoryId: string; categoryName?: string }[]>(
          "/category",
        );
      const list = Array.isArray(res.data) ? res.data : [];
      setCategories(
        list.map((c) => ({
          id: c.categoryId,
          name: c.categoryName ?? c.categoryId,
        })),
      );
    } catch {
      setCategories([]);
    }
  }, []);

  const fetchSubCategoryOptions = useCallback(async () => {
    try {
      const res = await apiClient.get<
        {
          subCategoryId: string;
          subCategoryName?: string;
          categoryId: string;
        }[]
      >("/sub-category", {
        params: filters.categoryId ? { categoryId: filters.categoryId } : {},
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setSubCategories(
        list.map((s) => ({
          id: s.subCategoryId,
          name: s.subCategoryName ?? s.subCategoryId,
          categoryId: s.categoryId,
        })),
      );
    } catch {
      setSubCategories([]);
    }
  }, [filters.categoryId]);

  useEffect(() => {
    void fetchSummary(filters);
  }, []);

  useEffect(() => {
    void fetchCategoryOptions();
    void fetchSubCategoryOptions();
  }, [fetchCategoryOptions, fetchSubCategoryOptions]);

  const displaySubCategories = filters.categoryId
    ? subCategories.filter((s) => s.categoryId === filters.categoryId)
    : subCategories;

  const handleApplyFilters = () => {
    void fetchSummary(filters);
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    void fetchSummary(defaultFilters);
  };

  const rows = summary?.rows ?? [];
  const totals = summary?.totals;

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            สรุปยอดซื้อ–ขาย รายสินค้า
          </h1>
          <p className="mt-1 text-xs text-gray-600">
            สรุปตามหมวดหมู่ย่อย (Sub Category) จากข้อมูลออเดอร์
          </p>
        </div>
        <div className="text-right text-xs text-gray-500">
          สีหลักของระบบใช้ตามธีมที่กำหนด
        </div>
      </div>

      <OrderFilters
        value={filters}
        categories={categories}
        subCategories={displaySubCategories}
        onChange={(next) => setFilters(next)}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {loading && (
        <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          กำลังโหลดข้อมูลสรุป...
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
          <thead className="bg-[color:var(--color-primary)] text-white">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Category</th>
              <th className="px-3 py-2 text-left font-medium">Sub Category</th>
              <th className="px-3 py-2 text-center font-medium">
                ซื้อ – จำนวน (กก.)
              </th>
              <th className="px-3 py-2 text-center font-medium">
                ซื้อ – ราคา (บาท)
              </th>
              <th className="px-3 py-2 text-center font-medium">
                ซื้อ – เกรด A/B/C/D (กก.)
              </th>
              <th className="px-3 py-2 text-left font-medium">
                ซื้อ – Order IDs
              </th>
              <th className="px-3 py-2 text-center font-medium">
                ขาย – จำนวน (กก.)
              </th>
              <th className="px-3 py-2 text-center font-medium">
                ขาย – ราคา (บาท)
              </th>
              <th className="px-3 py-2 text-center font-medium">
                ขาย – เกรด A/B/C/D (กก.)
              </th>
              <th className="px-3 py-2 text-left font-medium">
                ขาย – Order IDs
              </th>
              <th className="px-3 py-2 text-center font-medium">
                คงเหลือ (กก.)
              </th>
              <th className="px-3 py-2 text-center font-medium">
                คงเหลือ (บาท)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-6 text-center text-sm text-gray-500"
                >
                  ไม่พบข้อมูลสรุปตามตัวกรอง
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.categoryId}-${row.subCategoryId}`}>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                    {row.categoryName || row.categoryId || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                    {row.subCategoryName || row.subCategoryId || "-"}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-900">
                    {formatNumber(row.buy.quantityKg, 3)}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-900">
                    {row.buy.minPrice == null && row.buy.maxPrice == null
                      ? "-"
                      : row.buy.minPrice === row.buy.maxPrice
                        ? formatNumber(row.buy.minPrice ?? 0)
                        : `${formatNumber(row.buy.minPrice ?? 0)} – ${formatNumber(
                            row.buy.maxPrice ?? 0,
                          )}`}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-900">
                    {`A:${formatNumber(row.buy.gradeAQtyKg, 3)} / B:${formatNumber(
                      row.buy.gradeBQtyKg,
                      3,
                    )} / C:${formatNumber(row.buy.gradeCQtyKg, 3)} / D:${formatNumber(
                      row.buy.gradeDQtyKg,
                      3,
                    )}`}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    {row.buy.orderIds.length === 0
                      ? "-"
                      : row.buy.orderIds.join(", ")}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-900">
                    {formatNumber(row.sell.quantityKg, 3)}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-900">
                    {row.sell.minPrice == null && row.sell.maxPrice == null
                      ? "-"
                      : row.sell.minPrice === row.sell.maxPrice
                        ? formatNumber(row.sell.minPrice ?? 0)
                        : `${formatNumber(row.sell.minPrice ?? 0)} – ${formatNumber(
                            row.sell.maxPrice ?? 0,
                          )}`}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-900">
                    {`A:${formatNumber(row.sell.gradeAQtyKg, 3)} / B:${formatNumber(
                      row.sell.gradeBQtyKg,
                      3,
                    )} / C:${formatNumber(row.sell.gradeCQtyKg, 3)} / D:${formatNumber(
                      row.sell.gradeDQtyKg,
                      3,
                    )}`}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    {row.sell.orderIds.length === 0
                      ? "-"
                      : row.sell.orderIds.join(", ")}
                  </td>
                  <td className="px-3 py-2 text-center font-semibold text-[color:var(--color-secondary)]">
                    {formatNumber(row.remainQuantityKg, 3)}
                  </td>
                  <td className="px-3 py-2 text-center font-semibold text-[color:var(--color-secondary)]">
                    ฿{formatNumber(row.remainAmount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totals && (
        <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm sm:grid-cols-3">
          <div className="rounded-md bg-[color:var(--color-primary)]/5 p-3">
            <div className="text-xs font-semibold uppercase text-[color:var(--color-primary)]">
              รวมฝั่งซื้อ
            </div>
            <div className="mt-1 text-sm text-gray-900">
              จำนวนรวม:{" "}
              <span className="font-semibold">
                {formatNumber(totals.buyQuantityKg, 3)} กก.
              </span>
            </div>
            <div className="text-sm text-gray-900">
              ยอดรวม:{" "}
              <span className="font-semibold">
                ฿{formatNumber(totals.buyAmount)}
              </span>
            </div>
          </div>
          <div className="rounded-md bg-[color:var(--color-secondary)]/5 p-3">
            <div className="text-xs font-semibold uppercase text-[color:var(--color-secondary)]">
              รวมฝั่งขาย
            </div>
            <div className="mt-1 text-sm text-gray-900">
              จำนวนรวม:{" "}
              <span className="font-semibold">
                {formatNumber(totals.sellQuantityKg, 3)} กก.
              </span>
            </div>
            <div className="text-sm text-gray-900">
              ยอดรวม:{" "}
              <span className="font-semibold">
                ฿{formatNumber(totals.sellAmount)}
              </span>
            </div>
          </div>
          <div className="rounded-md bg-gradient-to-br from-[color:var(--color-primary)]/10 via-white to-[color:var(--color-secondary)]/10 p-3">
            <div className="text-xs font-semibold uppercase text-gray-800">
              คงเหลือรวม
            </div>
            <div className="mt-1 text-sm text-gray-900">
              จำนวนคงเหลือ:{" "}
              <span className="font-semibold">
                {formatNumber(totals.remainQuantityKg, 3)} กก.
              </span>
            </div>
            <div className="text-sm text-gray-900">
              มูลค่าคงเหลือ:{" "}
              <span className="font-semibold">
                ฿{formatNumber(totals.remainAmount)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
