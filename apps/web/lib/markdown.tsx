import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Rendu Markdown minimal et sûr (aucun HTML brut interprété) pour les articles et guides :
 * titres ##/###, paragraphes, listes, citations >, tableaux | a | b |, **gras**, `code`, [liens](url).
 * Suffisant pour du contenu éditorial ; évite une dépendance de parsing complète.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[2]) out.push(<strong key={key}>{m[2]}</strong>);
    else if (m[4]) out.push(<code key={key}>{m[4]}</code>);
    else if (m[6] && m[7]) {
      const href = m[7];
      if (href.startsWith("/")) out.push(<Link key={key} href={href}>{m[6]}</Link>);
      else if (/^https:\/\//.test(href)) out.push(<a key={key} href={href} target="_blank" rel="noopener noreferrer">{m[6]}</a>);
      else out.push(m[6]);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="prose-vae">
      {blocks.map((block, b) => {
        const key = `b${b}`;
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        if (lines.length === 0) return null;
        if (lines[0]!.startsWith("### ")) return <h3 key={key}>{inline(lines[0]!.slice(4), key)}</h3>;
        if (lines[0]!.startsWith("## ")) return <h2 key={key}>{inline(lines[0]!.slice(3), key)}</h2>;
        if (lines.length >= 2 && lines.every((l) => l.trim().startsWith("|")) && /^\|[\s:|-]+\|$/.test(lines[1]!.trim())) {
          const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
          const [head, , ...rows] = lines;
          return (
            <div key={key} className="overflow-x-auto">
              <table>
                <thead><tr>{cells(head!).map((c, i) => <th key={i} scope="col">{inline(c, `${key}-h${i}`)}</th>)}</tr></thead>
                <tbody>{rows.map((r, j) => <tr key={j}>{cells(r).map((c, i) => <td key={i}>{inline(c, `${key}-${j}-${i}`)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
        if (lines.every((l) => l.startsWith("> "))) return <blockquote key={key} className="border-l-2 border-accent pl-4 italic">{inline(lines.map((l) => l.slice(2)).join(" "), key)}</blockquote>;
        if (lines.every((l) => /^[-*] /.test(l))) return <ul key={key}>{lines.map((l, i) => <li key={i}>{inline(l.slice(2), `${key}-${i}`)}</li>)}</ul>;
        if (lines.every((l) => /^\d+\. /.test(l))) return <ol key={key}>{lines.map((l, i) => <li key={i}>{inline(l.replace(/^\d+\. /, ""), `${key}-${i}`)}</li>)}</ol>;
        return <p key={key}>{inline(lines.join(" "), key)}</p>;
      })}
    </div>
  );
}
