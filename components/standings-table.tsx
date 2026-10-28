import Link from "next/link";
import { formatNumber } from "@/lib/format";

type Row = {
  schoolId: string;
  schoolName: string;
  points: number;
  rank: number;
  provisional?: boolean;
};

export function StandingsTable({
  rows,
  compact = false,
  categorySlug,
}: {
  rows: Row[];
  compact?: boolean;
  categorySlug?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="border border-line bg-white/40 px-6 py-10 text-center">
        <p className="display text-2xl text-muted">No points on the board yet.</p>
        <p className="mt-2 text-sm text-muted">
          Standings appear when the first published result lands.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-left">
        <caption className="sr-only">
          School standings ordered by total published points
        </caption>
        <thead>
          <tr className="eyebrow text-muted">
            <th scope="col" className="w-16 py-3 pr-3 font-bold">
              Rank
            </th>
            <th scope="col" className="py-3 pr-3 font-bold">
              School
            </th>
            <th scope="col" className="py-3 text-right font-bold">
              Points
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.schoolId}
              className={`border-t border-line ${row.rank === 1 ? "bg-flame/[0.045]" : ""}`}
            >
              <td className="py-4 pr-3 align-middle">
                <span
                  className={`display inline-flex h-9 min-w-9 items-center justify-center px-1 text-xl ${
                    row.rank === 1
                      ? "bg-ink text-paper"
                      : row.rank <= 3
                        ? "border border-ink/30 text-ink"
                        : "text-muted"
                  }`}
                >
                  {row.rank}
                </span>
              </td>
              <td className="py-4 pr-3 align-middle">
                <span
                  className={`font-medium ${compact ? "text-base" : "text-lg md:text-xl"}`}
                >
                  {row.schoolName}
                </span>
                {row.provisional ? (
                  <span className="ml-2 inline-block align-middle text-[0.62rem] font-bold uppercase tracking-wider text-gold">
                    Provisional
                  </span>
                ) : null}
              </td>
              <td className="py-4 text-right align-middle">
                <span className="display text-2xl tabular-nums md:text-3xl">
                  {formatNumber(row.points)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {categorySlug ? (
        <div className="mt-4 text-right">
          <Link
            href={`/scoreboard/categories/${categorySlug}`}
            className="text-xs font-bold uppercase tracking-[0.14em] text-teal underline-offset-4 hover:underline"
          >
            Open category results
          </Link>
        </div>
      ) : null}
    </div>
  );
}
