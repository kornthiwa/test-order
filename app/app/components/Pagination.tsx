type PaginationProps = {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  pageItemsCount: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export function Pagination({
  currentPage,
  totalPages,
  startIndex,
  pageItemsCount,
  totalItems,
  onPageChange,
}: PaginationProps) {
  const handlePrevious = () => {
    onPageChange(Math.max(1, currentPage - 1));
  };

  const handleNext = () => {
    onPageChange(Math.min(totalPages, currentPage + 1));
  };

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
      <div>
        Showing{" "}
        <span className="font-medium">
          {totalItems === 0 ? 0 : startIndex + 1}
        </span>{" "}
        to{" "}
        <span className="font-medium">
          {startIndex + pageItemsCount}
        </span>{" "}
        of <span className="font-medium">{totalItems}</span> results
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-xs text-gray-600">
          Page <span className="font-semibold">{currentPage}</span> of{" "}
          <span className="font-semibold">{totalPages}</span>
        </span>
        <button
          type="button"
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

