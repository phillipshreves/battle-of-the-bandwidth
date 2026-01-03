interface PaginationProps {
    offset: number;
    limit: number;
    dataLength: number;
    onPreviousPage: () => void;
    onNextPage: () => void;
}

export default function Pagination({
    offset,
    limit,
    dataLength,
    onPreviousPage,
    onNextPage
}: PaginationProps) {
    return (
        <div className="flex items-center justify-center gap-4 py-4">
            <button
                className="px-4 py-2 rounded-lg bg-secondary/10 hover:bg-secondary/20
                   transition-colors duration-200 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onPreviousPage}
                disabled={offset === 0}
            >
                ← Newer
            </button>
            <span className="text-foreground">
                {dataLength > 0 ? `Showing ${offset + 1} - ${offset + Math.min(limit, dataLength)} results` : 'No results'}
            </span>
            <button
                className="px-4 py-2 rounded-lg bg-secondary/10 hover:bg-secondary/20
                   transition-colors duration-200 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onNextPage}
                disabled={dataLength < limit}
            >
                Older →
            </button>
        </div>
    );
}