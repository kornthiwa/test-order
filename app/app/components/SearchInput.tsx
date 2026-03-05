type SearchInputProps = {
  value: string;
  placeholder?: string;
  type?: string;
  min?: number;
  onChange: (value: string) => void;
};

export function SearchInput({
  value,
  placeholder = "Search...",
  type = "text",
  min,
  onChange,
}: SearchInputProps) {
  return (
    <div className="relative w-full max-w-xs">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />
    </div>
  );
}

export type OrderFiltersValue = {
  dateFrom: string;
  dateTo: string;
  categoryId: string;
  subCategoryId: string;
  orderId: string;
  orderIdMatchMode: "exact" | "contains";
  priceMin: string;
  priceMax: string;
  grade: "ALL" | "A" | "B" | "C" | "D";
};

type OrderFiltersProps = {
  value: OrderFiltersValue;
  categories: string[];
  subCategories: string[];
  onChange: (next: OrderFiltersValue) => void;
  onApply: () => void;
  onReset: () => void;
};

export function OrderFilters({
  value,
  categories,
  subCategories,
  onChange,
  onApply,
  onReset,
}: OrderFiltersProps) {
  const handleFieldChange = <K extends keyof OrderFiltersValue>(
    key: K,
    fieldValue: OrderFiltersValue[K],
  ) => {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  };

  return (
    <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">
          วันที่เริ่มต้น (From)
        </label>
        <SearchInput
          type="date"
          value={value.dateFrom}
          onChange={(v) => handleFieldChange("dateFrom", v)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">
          วันที่สิ้นสุด (To)
        </label>
        <SearchInput
          type="date"
          value={value.dateTo}
          onChange={(v) => handleFieldChange("dateTo", v)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">
          หมวดหมู่ (categoryId)
        </label>
        <select
          value={value.categoryId}
          onChange={(e) => {
            handleFieldChange("categoryId", e.target.value);
            handleFieldChange("subCategoryId", "");
          }}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        >
          <option value="">ทั้งหมด</option>
          {categories.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">
          หมวดหมู่ย่อย (subCategoryId)
        </label>
        <select
          value={value.subCategoryId}
          onChange={(e) => handleFieldChange("subCategoryId", e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          disabled={subCategories.length === 0}
        >
          <option value="">ทั้งหมด</option>
          {subCategories.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">
          หมายเลขคำสั่งซื้อ (orderId)
        </label>
        <SearchInput
          value={value.orderId}
          onChange={(v) => handleFieldChange("orderId", v)}
          placeholder="เช่น CUNIIPRO202404..."
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">
          รูปแบบการค้นหา orderId
        </label>
        <select
          value={value.orderIdMatchMode}
          onChange={(e) =>
            handleFieldChange(
              "orderIdMatchMode",
              e.target.value as OrderFiltersValue["orderIdMatchMode"],
            )
          }
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        >
          <option value="contains">contains</option>
          <option value="exact">exact</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">
          ราคาเริ่มต้น
        </label>
        <SearchInput
          type="number"
          value={value.priceMin}
          onChange={(v) => handleFieldChange("priceMin", v)}
          placeholder="0"
          min={0}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">
          ราคาสุดท้าย
        </label>
        <SearchInput
          type="number"
          value={value.priceMax}
          onChange={(v) => handleFieldChange("priceMax", v)}
          placeholder="0"
          min={0}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">เกรด</label>
        <select
          value={value.grade}
          onChange={(e) =>
            handleFieldChange(
              "grade",
              e.target.value as OrderFiltersValue["grade"],
            )
          }
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        >
          <option value="ALL">ทั้งหมด</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </div>

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={onApply}
          className="inline-flex flex-1 items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          ใช้ตัวกรองและเรียก API
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          ล้างตัวกรอง
        </button>
      </div>
    </div>
  );
}

