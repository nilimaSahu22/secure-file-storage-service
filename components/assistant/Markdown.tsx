"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const COMPONENTS: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-slate-400">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-slate-400">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#2f66ea] underline underline-offset-2">
      {children}
    </a>
  ),
  h1: ({ children }) => <p className="mb-1 mt-3 font-semibold text-slate-900 first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="mb-1 mt-3 font-semibold text-slate-900 first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="mb-1 mt-3 font-semibold text-slate-900 first:mt-0">{children}</p>,
  code: ({ children }) => (
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-slate-800">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[13px] leading-relaxed text-slate-100 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-slate-200 pl-3 text-slate-600">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-slate-200" />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left font-semibold text-slate-700">{children}</th>
  ),
  td: ({ children }) => <td className="border border-slate-200 px-2 py-1 align-top">{children}</td>,
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-[15px] leading-relaxed text-slate-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
