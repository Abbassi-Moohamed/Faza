import { SectionCard } from "./SectionCard";

export interface RankingEntry {
  /** A stable key: two items of the same ranking never share a name. */
  key: string;
  name: string;
  value: number;
  detail: string;
}

type Props = {
  title: string;
  eyebrow?: string;
  entries: RankingEntry[];
  /** How many entries are shown. */
  limit?: number;
  /** The message shown when the ranking is empty. */
  emptyMessage: string;
};

/** A ranked list: the best entries first, each with a proportional bar. */
export function RankingList({ title, eyebrow, entries, limit = 5, emptyMessage }: Props) {
  const visible = entries.slice(0, limit);
  const max = Math.max(...visible.map((entry) => entry.value), 1);
  return (
    <SectionCard title={title} eyebrow={eyebrow}>
      {visible.length === 0 ? (
        <p className="insights-muted">{emptyMessage}</p>
      ) : (
        <ol className="insights-ranking">
          {visible.map((entry) => (
            <li key={entry.key}>
              <span>{entry.name}</span>
              <i>
                <b style={{ width: `${(entry.value / max) * 100}%` }} />
              </i>
              <strong>{entry.detail}</strong>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
