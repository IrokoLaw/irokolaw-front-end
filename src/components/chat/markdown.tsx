"use client";

import Markdown from "markdown-to-jsx";
import { cn } from "@/lib/utils";

const MarkdownMessage = ({ answer }: { answer: string }) => {
  return (
    <div className="mb-8">
      <div className="text-justify mb-5 leading-relaxed">
        <Markdown
          className={cn(
            "font-poppins lg:text-base text-stone-800",
            "prose prose-stone max-w-none break-words",
            "prose-h1:mb-8 prose-h2:mb-2 prose-h2:mt-8 prose-h2:font-bold prose-h1:font-bold",
            "prose-h3:mt-6 prose-h3:mb-1.5  prose-h3:font-medium",
            "prose-p:mt-4 prose-p:mb-4 prose-p:font-medium prose-p:leading-relaxed",
            "prose-a:text-blue-600 prose-a:font-medium prose-a:underline hover:prose-a:text-blue-800",
            "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic",
            "prose-ul:list-disc prose-ul:pl-6 prose-ul:mt-2 prose-li:mb-1",
            "prose-pre:bg-stone-100 prose-pre:p-4 prose-pre:rounded-md",
            "prose-code:bg-stone-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
            "prose-strong:font-bold"
          )}
          options={{
            overrides: {
              h2: {
                component: ({ children, ...props }) => (
                  <>
                    <h2 {...props}>{children}</h2>
                    <hr className=" mt-4 mb-4 " />
                  </>
                ),
                props: {
                  className: "font-semibold mt-7  text-[20px]  mb-5",
                },
              },
            },
            forceBlock: true,
            wrapper: "article",
          }}
        >
          {answer}
        </Markdown>
      </div>
    </div>
  );
};

export default MarkdownMessage;
