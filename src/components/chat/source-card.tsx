import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Title } from "@radix-ui/react-dialog";

export default function SourceCard({
  title,
  article,
  openDoc,
  page,
  index,
}: {
  title: string;
  article: string;
  page: number;
  index: number;
  openDoc: () => void;
}) {
  return (
    <Card
      className="w-full lg:w-[350px] bg-[#F2F2F2] cursor-pointer"
      onClick={openDoc}
    >
      <CardContent>
        <h1 className="whitespace-nowrap overflow-hidden capitalize ">
          {index + 1}. {title}
        </h1>
        <div className="flex justify-between">
          <p className="font-medium text-[14px] mt-4 leading-[16px] text-[#6C6C6E]">
            Article {article}
          </p>
          <p className="font-medium text-[14px] mt-4 leading-[16px] text-[#6C6C6E]">
            Page {page}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
