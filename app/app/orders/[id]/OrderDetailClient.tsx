"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "../../lib/apiClient";
import {
  isMongoId,
  type Order,
  type CategoryRequest,
  type GradeRequest,
} from "../../lib/orderTypes";

type CategoryOption = { id: string; name: string };
type SubCategoryOption = { id: string; name: string; categoryId: string };

const formatCurrency = (value: number) =>
  value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getOverallTotal = (order: Order | null) =>
  (order?.requestList ?? []).reduce((sum, cat) => {
    return (
      sum +
      (cat.requestList ?? []).reduce(
        (inner, item) =>
          inner + (Number(item.price) || 0) * (Number(item.quantity) || 0),
        0,
      )
    );
  }, 0);

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

function ensureGradeList(cat: CategoryRequest): CategoryRequest {
  const list = cat.requestList ?? [];
  const grades = ["A", "B", "C", "D"] as const;
  const filled = grades.map(
    (g) =>
      list.find((x) => x.grade === g) ?? {
        grade: g,
        price: 0,
        quantity: "0",
        total: 0,
      },
  );
  return { ...cat, requestList: filled };
}

type Props = {
  id: string;
};

export function OrderDetailClient({ id }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Order> | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subCategoriesByCategory, setSubCategoriesByCategory] = useState<
    Record<string, SubCategoryOption[]>
  >({});

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

  useEffect(() => {
    if (!isEditing || !form) return;
    const cats = Array.from(
      new Set(
        (form.requestList ?? [])
          .map((c) => c.categoryID)
          .filter((x): x is string => Boolean(x)),
      ),
    );
    cats.forEach((c) => void ensureSubCategoriesLoaded(c));
  }, [isEditing, form]);

  useEffect(() => {
    const editParam = searchParams.get("edit");
    if (editParam == "1") setIsEditing(true);
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    const fetchOrder = async () => {
      setLoading(true);
      setError(null);

      try {
        if (isMongoId(id)) {
          const res = await apiClient.get<Order>(`/order/${id}`);
          if (!active) return;
          const data = res.data ?? null;
          setOrder(data);
          if (!data) setError("ไม่พบออเดอร์ตามรหัสที่ระบุ");
          return;
        }
        const res = await apiClient.get<Order>(`/order/by-order-id/${id}`);
        if (!active) return;
        const data = res.data ?? null;
        setOrder(data);
        if (!data) setError("ไม่พบออเดอร์ตามรหัสที่ระบุ");
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

  useEffect(() => {
    if (order) {
      const requestList = (order.requestList ?? []).map(ensureGradeList);
      const list = requestList.length
        ? requestList
        : [defaultCategoryRequest()];
      setForm({
        ...order,
        requestList: list,
        transactionParties: order.transactionParties ?? {
          customer: { roleName: "ผู้ขาย", name: "", id: "" },
          transport: { roleName: "ผู้จัดโปรโมชั่น", name: "", id: "" },
          collector: {
            roleName: "สถานที่ลงสินค้าหรือผู้รับซื้อ",
            name: "",
            id: "",
          },
        },
      });
    }
  }, [order, id]);

  const updateRequestList = (index: number, upd: Partial<CategoryRequest>) => {
    if (!form) return;
    const list = [...(form.requestList ?? [])];
    list[index] = { ...list[index], ...upd };
    setForm({ ...form, requestList: list });
  };

  const addCategory = () => {
    if (!form) return;
    setForm({
      ...form,
      requestList: [...(form.requestList ?? []), defaultCategoryRequest()],
    });
  };

  const removeCategory = (index: number) => {
    if (!form) return;
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
    if (!form) return;
    const list = [...(form.requestList ?? [])];
    const cat = {
      ...list[catIndex],
      requestList: [...(list[catIndex].requestList ?? [])],
    };
    cat.requestList[gradeIndex] = {
      ...cat.requestList[gradeIndex],
      ...upd,
    };
    list[catIndex] = cat;
    setForm({ ...form, requestList: list });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !id) return;
    setError(null);
    setSaving(true);
    try {
      const payload = {
        orderId: form.orderId?.trim(),
        orderType: form.orderType ?? "buy",
        orderFinishedDate: form.orderFinishedDate || undefined,
        orderFinishedTime: form.orderFinishedTime || undefined,
        requestList: form.requestList?.map((c) => ({
          categoryName: c.categoryName,
          subCategoryName: c.subCategoryName,
          categoryID: c.categoryID,
          subCategoryID: c.subCategoryID,
          requestList: c.requestList ?? [],
        })),
        transactionParties: form.transactionParties,
      };
      const res = await apiClient.patch<Order>(`/order/${id}`, payload);
      setOrder(res.data ?? form);
      setIsEditing(false);
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

  const handleDelete = async () => {
    if (!isMongoId(id)) return;
    if (!confirm("ต้องการลบออเดอร์นี้ใช่หรือไม่?")) return;
    try {
      await apiClient.delete(`/order/${id}`);
      router.push("/orders");
    } catch (err) {
      console.error("Delete failed", err);
      alert("ลบไม่สำเร็จ");
    }
  };

  const displayOrder = isEditing && form ? form : order;
  const requestList = (displayOrder?.requestList ?? []) as CategoryRequest[];

  const getCategoryDisplayName = (cat: CategoryRequest) =>
    cat.categoryName?.trim() ||
    categories.find((c) => c.id === cat.categoryID)?.name ||
    cat.categoryID ||
    "-";

  const getSubCategoryDisplayName = (cat: CategoryRequest) =>
    cat.subCategoryName?.trim() ||
    (cat.categoryID
      ? subCategoriesByCategory[cat.categoryID]?.find(
          (s) => s.id === cat.subCategoryID,
        )?.name
      : undefined) ||
    cat.subCategoryID ||
    "-";

  const flattenedRows = requestList.flatMap((cat) =>
    (cat.requestList ?? []).map((item, idx) => ({
      key: `${cat.categoryID}-${cat.subCategoryID}-${idx}`,
      categoryID: cat.categoryID,
      subCategoryID: cat.subCategoryID,
      categoryName: getCategoryDisplayName(cat),
      subCategoryName: getSubCategoryDisplayName(cat),
      grade: item.grade,
      price: item.price,
      quantity: item.quantity,
      total: item.total,
    })),
  );

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {isEditing ? "แก้ไขออเดอร์" : "ดูรายละเอียดออเดอร์"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">รหัสออเดอร์: {id}</p>
        </div>
        <div className="flex items-center gap-2">
          {order && isMongoId(id) && (
            <>
              {isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    if (order) {
                      const requestList = (order.requestList ?? []).map(
                        ensureGradeList,
                      );
                      const list = requestList.length
                        ? requestList
                        : [defaultCategoryRequest()];
                      setForm({
                        ...order,
                        requestList: list,
                        transactionParties: order.transactionParties ?? {
                          customer: { roleName: "ผู้ขาย", name: "", id: "" },
                          transport: {
                            roleName: "ผู้จัดโปรโมชั่น",
                            name: "",
                            id: "",
                          },
                          collector: {
                            roleName: "สถานที่ลงสินค้าหรือผู้รับซื้อ",
                            name: "",
                            id: "",
                          },
                        },
                      });
                    }
                  }}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center rounded-md border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  แก้ไข
                </button>
              )}
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                ลบ
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            ย้อนกลับ
          </button>
        </div>
      </div>

      {loading && !order && !error && (
        <div className="rounded-md bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
          กำลังโหลดข้อมูลออเดอร์...
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && !order && !loading && (
        <div className="rounded-md bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
          ไม่พบข้อมูลออเดอร์
        </div>
      )}

      {!error && order && isEditing && form ? (
        <form onSubmit={handleSave} className="flex flex-col gap-6">
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
                  onChange={(e) =>
                    setForm({ ...form, orderId: e.target.value })
                  }
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
                    {(() => {
                      const categoryOptions =
                        cat.categoryID &&
                        !categories.some((c) => c.id === cat.categoryID)
                          ? [
                              ...categories,
                              { id: cat.categoryID, name: cat.categoryID },
                            ]
                          : categories;

                      const baseSubs = cat.categoryID
                        ? (subCategoriesByCategory[cat.categoryID] ?? [])
                        : [];

                      const subOptions =
                        cat.subCategoryID &&
                        !baseSubs.some((s) => s.id === cat.subCategoryID)
                          ? [
                              ...baseSubs,
                              {
                                id: cat.subCategoryID,
                                name: cat.subCategoryID,
                                categoryId: cat.categoryID || "",
                              },
                            ]
                          : baseSubs;

                      return (
                        <>
                          <select
                            value={cat.categoryID}
                            onChange={(e) =>
                              (() => {
                                const next = e.target.value;
                                const nextName = next
                                  ? categoryOptions.find((c) => c.id === next)
                                      ?.name ?? next
                                  : "";
                                updateRequestList(catIndex, {
                                  categoryID: next,
                                  categoryName: nextName,
                                  subCategoryID: "",
                                  subCategoryName: "",
                                });
                                void ensureSubCategoriesLoaded(next);
                              })()
                            }
                            className="w-40 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                          >
                            <option value="">เลือกหมวดหมู่</option>
                            {categoryOptions.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>

                          <select
                            value={cat.subCategoryID}
                            onChange={(e) =>
                              (() => {
                                const next = e.target.value;
                                const nextName = next
                                  ? subOptions.find((s) => s.id === next)
                                      ?.name ?? next
                                  : "";
                                updateRequestList(catIndex, {
                                  subCategoryID: next,
                                  subCategoryName: nextName,
                                });
                              })()
                            }
                            disabled={
                              !cat.categoryID || subOptions.length === 0
                            }
                            className="w-48 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm disabled:opacity-50"
                          >
                            <option value="">เลือกหมวดหมู่ย่อย</option>
                            {subOptions.map((s) => (
                              <option
                                key={`${s.categoryId}-${s.id}`}
                                value={s.id}
                              >
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </>
                      );
                    })()}
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
          </div>
        </form>
      ) : (
        !error &&
        order &&
        displayOrder && (
          <>
            <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs font-medium uppercase text-gray-500">
                  Order ID
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {displayOrder.orderId ?? "-"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase text-gray-500">
                  วันที่ทำรายการ
                </div>
                <div className="text-sm text-gray-900">
                  {[
                    displayOrder.orderFinishedDate ?? "-",
                    displayOrder.orderFinishedTime ?? "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase text-gray-500">
                  ประเภทออเดอร์
                </div>
                <div className="text-sm text-gray-900">
                  {displayOrder.orderType === "buy"
                    ? "ซื้อ"
                    : displayOrder.orderType === "sell"
                      ? "ขาย"
                      : (displayOrder.orderType ?? "-")}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase text-gray-500">
                  รวมยอดทั้งหมด
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  ฿{formatCurrency(getOverallTotal(displayOrder as Order))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-600">
                คู่สัญญา / ฝ่ายที่เกี่ยวข้อง
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-md border border-gray-100 bg-gray-50/50 p-3">
                  <div className="text-xs font-medium uppercase text-gray-500">
                    {displayOrder.transactionParties?.customer?.roleName ??
                      "ผู้ขาย"}
                  </div>
                  <div className="mt-1 text-sm font-medium text-gray-900">
                    {displayOrder.transactionParties?.customer?.name ?? "-"}
                  </div>
                  {displayOrder.transactionParties?.customer?.id && (
                    <div className="mt-0.5 font-mono text-xs text-gray-500">
                      {displayOrder.transactionParties.customer.id}
                    </div>
                  )}
                </div>
                <div className="rounded-md border border-gray-100 bg-gray-50/50 p-3">
                  <div className="text-xs font-medium uppercase text-gray-500">
                    {displayOrder.transactionParties?.transport?.roleName ??
                      "ผู้จัดโปรโมชั่น"}
                  </div>
                  <div className="mt-1 text-sm font-medium text-gray-900">
                    {displayOrder.transactionParties?.transport?.name ?? "-"}
                  </div>
                  {displayOrder.transactionParties?.transport?.id && (
                    <div className="mt-0.5 font-mono text-xs text-gray-500">
                      {displayOrder.transactionParties.transport.id}
                    </div>
                  )}
                </div>
                <div className="rounded-md border border-gray-100 bg-gray-50/50 p-3">
                  <div className="text-xs font-medium uppercase text-gray-500">
                    {displayOrder.transactionParties?.collector?.roleName ??
                      "สถานที่ลงสินค้าหรือผู้รับซื้อ"}
                  </div>
                  <div className="mt-1 text-sm font-medium text-gray-900">
                    {displayOrder.transactionParties?.collector?.name ?? "-"}
                  </div>
                  {displayOrder.transactionParties?.collector?.id && (
                    <div className="mt-0.5 font-mono text-xs text-gray-500">
                      {displayOrder.transactionParties.collector.id}
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
                        หมวดหมู่ย่อย
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
                          {row.categoryName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                          {row.subCategoryName}
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
                          ฿
                          {formatCurrency(
                            (Number(row.price) || 0) *
                              (Number(row.quantity) || 0),
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}
