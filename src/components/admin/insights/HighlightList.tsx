import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  /** The takeaways computed by the server. */
  messages: Array<{ id: string; message: string; kind: "positive" | "warning" | "neutral" }>;
  emptyMessage: string;
};

/** The takeaways of the period: what the coffee admin should act on next. */
export function HighlightList({ title, messages, emptyMessage }: Props) {
  return (
    <SectionCard wide title={title}>
      {messages.length === 0 ? (
        <p className="insights-muted">{emptyMessage}</p>
      ) : (
        <ul className="insights-actions">
          {messages.map((message) => (
            <li key={message.id} className={`insights-actions__item insights-actions__item--${message.kind}`}>
              {message.message}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
