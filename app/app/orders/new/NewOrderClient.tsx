"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../lib/apiClient";
import {
  getOrderApiId,
  type CategoryRequest,
  type GradeRequest,
  type Order,
} from "../../lib/orderTypes";

type CategoryOption = { id: string; name: string };
type SubCategoryOption = { id: string; name: string; categoryId: string };

const formatCurrency = (value: number) =>
  value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const defaultCategoryRequest = (): CategoryRequest => ({
  categoryName: "",
  subCategoryName: "",
  categoryID: "",
  subCategoryID: "",
  requestList: [
    { grade: "A", price: 0, quantity: "0", total: 0 },
    { grade: "B", price: 0, quantity: "0", total: 0 },
    { grade: "C", price: 0, quantity: "0", total: 0 },
    { grade: "D", price: 0, quantity: "0", total: 0 },
  ],
});

export function NewOrderClient() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subCategoriesByCategory, setSubCategoriesByCategory] = useState<
    Record<string, SubCategoryOption[]>
  >({});

  const [form, setForm] = useState<Partial<Order>>({
    orderId: "",
    orderType: "buy",
    orderFinishedDate: "",
    orderFinishedTime: "",
    requestList: [defaultCategoryRequest()],
    transactionParties: {
      customer: { roleName: "ผู้ขาย", name: "", id: "" },
      transport: { roleName: "ผู้จัดโปรโมชั่น", name: "", id: "" },
      collector: {
        roleName: "สถานที่ลงสินค้าหรือผู้รับซื้อ",
        name: "",
        id: "",
      },
    },
  });

  useEffect(() => {
    let active = true;

    const fetchOptions = async () => {
      try {
        const catRes = await apiClient.get<
          {
            categoryId: string;
            categoryName?: string;
          }[]
        >("/category");

        if (!active) return;

        const catList = Array.isArray(catRes.data) ? catRes.data : [];

        setCategories(
          catList.map((c) => ({
            id: c.categoryId,
            name: c.categoryName ?? c.categoryId,
          })),
        );
      } catch {
        if (!active) return;
        setCategories([]);
        setSubCategoriesByCategory({});
      }
    };

    void fetchOptions();

    return () => {
      active = false;
    };
  }, []);

  const ensureSubCategoriesLoaded = async (categoryId: string) => {
    if (!categoryId) return;
    if (subCategoriesByCategory[categoryId]) return;
    try {
      const res = await apiClient.get<
        {
          subCategoryId: string;
          subCategoryName?: string;
          categoryId: string;
        }[]
      >("/sub-category", { params: { categoryId } });
      const list = Array.isArray(res.data) ? res.data : [];
      setSubCategoriesByCategory((prev) => ({
        ...prev,
        [categoryId]: list.map((s) => ({
          id: s.subCategoryId,
          name: s.subCategoryName ?? s.subCategoryId,
          categoryId: s.categoryId,
        })),
      }));
    } catch {
      setSubCategoriesByCategory((prev) => ({ ...prev, [categoryId]: [] }));
    }
  };

  const overallTotal = useMemo(() => {
    const order = form as Order;
    return (order.requestList ?? []).reduce((sum, cat) => {
      return (
        sum +
        (cat.requestList ?? []).reduce(
          (inner, item) =>
            inner + (Number(item.price) || 0) * (Number(item.quantity) || 0),
          0,
        )
      );
    }, 0);
  }, [form]);

  const updateRequestList = (index: number, upd: Partial<CategoryRequest>) => {
    const list = [...(form.requestList ?? [])];
    list[index] = { ...(list[index] as CategoryRequest), ...upd };
    setForm({ ...form, requestList: list });
  };

  const addCategory = () => {
    setForm({
      ...form,
      requestList: [...(form.requestList ?? []), defaultCategoryRequest()],
    });
  };

  const removeCategory = (index: number) => {
    const list = (form.requestList ?? []).filter((_, i) => i !== index);
    setForm({
      ...form,
      requestList: list.length ? list : [defaultCategoryRequest()],
    });
  };

  const updateGrade = (
    catIndex: number,
    gradeIndex: number,
    upd: Partial<GradeRequest>,
  ) => {
    const list = [...(form.requestList ?? [])] as CategoryRequest[];
    const cat = {
      ...(list[catIndex] ?? defaultCategoryRequest()),
      requestList: [...((list[catIndex]?.requestList ?? []) as GradeRequest[])],
    };
    cat.requestList[gradeIndex] = {
      ...cat.requestList[gradeIndex],
      ...upd,
    };
    list[catIndex] = cat;
    setForm({ ...form, requestList: list });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        orderId: form.orderId?.trim(),
        orderType: form.orderType ?? "buy",
        orderFinishedDate: form.orderFinishedDate || undefined,
        orderFinishedTime: form.orderFinishedTime || undefined,
        requestList: (form.requestList ?? []).map((c) => ({
          categoryID: c.categoryID,
          subCategoryID: c.subCategoryID,
          requestList: c.requestList ?? [],
        })),
        transactionParties: form.transactionParties,
      };

      const res = await apiClient.post<Order>("/order", payload);
      const created = res.data ?? (payload as unknown as Order);
      const detailId = getOrderApiId(created);
      router.push(`/orders/${detailId}?edit=1`);
    } catch (err: unknown) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as Error).message)
          : "เกิดข้อผิดพลาด",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">เพิ่มออเดอร์</h1>
          <p className="mt-1 text-sm text-gray-600">
            รวมยอดทั้งหมด: ฿{formatCurrency(overallTotal)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            ย้อนกลับ
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="flex flex-col gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase text-gray-600">
            ข้อมูลหลัก
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-gray-500">
                Order ID *
              </label>
              <input
                type="text"
                required
                value={form.orderId ?? ""}
                onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">
                ประเภท
              </label>
              <select
                value={form.orderType ?? "buy"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    orderType: e.target.value as "buy" | "sell",
                  })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="buy">ซื้อ</option>
                <option value="sell">ขาย</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">
                วันที่ (YYYY-MM-DD)
              </label>
              <input
                type="date"
                value={form.orderFinishedDate ?? ""}
                onChange={(e) =>
                  setForm({ ...form, orderFinishedDate: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">
                เวลา (HH:mm)
              </label>
              <input
                type="time"
                value={form.orderFinishedTime ?? ""}
                onChange={(e) =>
                  setForm({ ...form, orderFinishedTime: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase text-gray-600">
            คู่สัญญา
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {(["customer", "transport", "collector"] as const).map((key) => (
              <div
                key={key}
                className="rounded border border-gray-100 bg-gray-50/50 p-3"
              >
                <label className="block text-xs font-medium text-gray-500">
                  {form.transactionParties?.[key]?.roleName ?? key}
                </label>
                <input
                  type="text"
                  placeholder="ชื่อ"
                  value={form.transactionParties?.[key]?.name ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      transactionParties: {
                        ...form.transactionParties,
                        [key]: {
                          ...form.transactionParties?.[key],
                          name: e.target.value,
                        },
                      },
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="ID"
                  value={form.transactionParties?.[key]?.id ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      transactionParties: {
                        ...form.transactionParties,
                        [key]: {
                          ...form.transactionParties?.[key],
                          id: e.target.value,
                        },
                      },
                    })
                  }
                  className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-gray-600">
              รายการตามหมวดหมู่
            </h2>
            <button
              type="button"
              onClick={addCategory}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              + เพิ่มหมวดหมู่
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {(form.requestList ?? []).map((cat, catIndex) => (
              <div
                key={catIndex}
                className="rounded border border-gray-200 bg-gray-50/30 p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <select
                    value={cat.categoryID}
                    onChange={(e) =>
                      (() => {
                        const next = e.target.value;
                        updateRequestList(catIndex, {
                          categoryID: next,
                          subCategoryID: "",
                        });
                        void ensureSubCategoriesLoaded(next);
                      })()
                    }
                    className="w-40 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                  >
                    <option value="">เลือกหมวดหมู่</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={cat.subCategoryID}
                    onChange={(e) =>
                      updateRequestList(catIndex, {
                        subCategoryID: e.target.value,
                      })
                    }
                    disabled={
                      !cat.categoryID ||
                      (subCategoriesByCategory[cat.categoryID]?.length ?? 0) ===
                        0
                    }
                    className="w-48 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm disabled:opacity-50"
                  >
                    <option value="">เลือกหมวดหมู่ย่อย</option>
                    {(subCategoriesByCategory[cat.categoryID] ?? []).map(
                      (s) => (
                        <option key={`${s.categoryId}-${s.id}`} value={s.id}>
                          {s.name}
                        </option>
                      ),
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeCategory(catIndex)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    ลบ
                  </button>
                </div>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="py-1">เกรด</th>
                      <th className="py-1">ราคา</th>
                      <th className="py-1">จำนวน</th>
                      <th className="py-1">รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cat.requestList ?? []).map((item, gradeIndex) => (
                      <tr key={gradeIndex}>
                        <td className="py-1">{item.grade}</td>
                        <td className="py-1">
                          <input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={(e) =>
                              updateGrade(catIndex, gradeIndex, {
                                price: Number(e.target.value) || 0,
                              })
                            }
                            className="w-20 rounded border border-gray-300 px-2 py-1"
                          />
                        </td>
                        <td className="py-1">
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={(e) =>
                              updateGrade(catIndex, gradeIndex, {
                                quantity: e.target.value,
                              })
                            }
                            className="w-24 rounded border border-gray-300 px-2 py-1"
                          />
                        </td>
                        <td className="py-1">
                          <input
                            type="number"
                            value={item.total}
                            onChange={(e) =>
                              updateGrade(catIndex, gradeIndex, {
                                total: Number(e.target.value) || 0,
                              })
                            }
                            className="w-24 rounded border border-gray-300 px-2 py-1"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-4 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/orders")}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            กลับไปหน้ารายการ
          </button>
        </div>
      </form>
    </div>
  );
}
