"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Markdown from "markdown-to-jsx";
import { cn } from "@/lib/utils";
import { useSelectedReference } from "../store/selected-reference";

const preprocessMarkdown = (text: string) => {
  const lines = text.split("\n");
  let processedLines = lines.map((line) => {
    const trimmedLine = line.trimStart();

    if (/^\d+\.\s/.test(trimmedLine)) {
      return `## ${trimmedLine}`;
    }
    if (/^[a-z]+\.\s/.test(trimmedLine)) {
      return `### ${trimmedLine}`;
    }

    return trimmedLine
      .replaceAll(/(Loi n° \d+-\d+)/g, "**$1**")
      .replaceAll(/(Décret n° \d+-\d+)/g, "**$1**")
      .replaceAll(/(arrêté n° \d+-\d+)/g, "**$1**");
  });

  processedLines = processedLines.map((line, index) => {
    if (
      line.trim() &&
      index < processedLines.length - 1 &&
      processedLines[index + 1].trim() &&
      !line.startsWith("#") &&
      !processedLines[index + 1].startsWith("#") &&
      !line.startsWith("-") &&
      !processedLines[index + 1].startsWith("-")
    ) {
      return `${line}  `;
    }
    return line;
  });

  return processedLines.join("\n");
};

const Answer = ({
  answer,
  chatId,
  onOpen,
}: {
  answer: string;
  chatId: string;
  onOpen: () => void;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying answer:", error);
    }
  };

  const setSelectedReference = useSelectedReference(
    (state) => state.setSelectedReference
  );
  const processedAnswer = preprocessMarkdown(answer);

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
              a: {
                component: ({ href, children }) => (
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedReference(href, chatId);
                      onOpen();
                    }}
                    style={{
                      cursor: "pointer",
                      color: "blue",
                      textDecoration: "underline",
                    }}
                  >
                    {children}
                  </span>
                ),
              },

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
          {processedAnswer}
        </Markdown>
      </div>
      <Button
        onClick={handleCopy}
        className="p-1 rounded-md hover:bg-gray-200 flex transition bg-[#F2F2F2] text-[#6C6C6E]"
      >
        {copied ? (
          <Check className="text-green-500" size={20} />
        ) : (
          <Copy size={20} />
        )}
        {copied ? "" : <span className="ml-1"> copier</span>}
      </Button>
    </div>
  );
};

export default Answer;
