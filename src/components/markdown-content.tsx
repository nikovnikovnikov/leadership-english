import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function linkifyMentions(text: string): string {
  // Don't process inside code blocks or inline code
  return text.replace(
    /(```[\s\S]*?```|`[^`]+`)|@([a-z0-9_]{3,20})/g,
    (match, code, username) => {
      if (code) return match;
      return `[${match}](/member/${username})`;
    },
  );
}

function getInstagramReelShortcode(href: string): string | null {
  const m = href.match(/instagram\.com\/reel\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

export function MarkdownContent({ content }: { content: string }) {
  const processed = linkifyMentions(content);

  return (
    <div className="prose prose-sm prose-stone max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            if (!href) return <a href={href}>{children}</a>;

            const igShortcode = getInstagramReelShortcode(href);
            if (igShortcode) {
              return (
                <div className="my-3 overflow-hidden rounded-lg border border-stone-200 dark:border-stone-800 max-w-[360px] mx-auto">
                  <div className="aspect-[9/16]">
                    <iframe
                      src={`https://www.instagram.com/reel/${igShortcode}/embed/`}
                      className="h-full w-full border-0"
                      allowFullScreen
                      loading="lazy"
                      title="Instagram Reel"
                    />
                  </div>
                </div>
              );
            }

            const isMention = href.startsWith("/member/");
            return (
              <a
                href={href}
                {...(isMention ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                className="text-[var(--primary)] dark:text-[var(--primary)] underline decoration-emerald-300 underline-offset-2 hover:text-[var(--primary)] dark:hover:brightness-110 hover:decoration-emerald-500"
              >
                {children}
              </a>
            );
          },
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="rounded bg-stone-100 dark:bg-stone-900 px-1.5 py-0.5 text-[13px] font-mono text-stone-800 dark:text-stone-200">
                  {children}
                </code>
              );
            }
            return (
              <code className={className}>{children}</code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-stone-300 dark:border-stone-800 pl-4 italic text-stone-600 dark:text-stone-300">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1">{children}</ol>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="border-collapse border border-stone-200 dark:border-stone-800 text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 px-3 py-1.5 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-stone-200 dark:border-stone-800 px-3 py-1.5">{children}</td>
          ),
          hr: () => <hr className="my-4 border-stone-200 dark:border-stone-800" />,
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mt-6 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold mt-5 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold mt-4 mb-1">{children}</h3>
          ),
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
