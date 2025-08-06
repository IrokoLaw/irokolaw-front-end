import { api } from "@/lib/api-client";
import { SourceResponse } from "@/types/api";

export const getSource = async ({
  chatId,
}: {
  chatId: string;
}): Promise<SourceResponse> => {
  const res = await api.get<SourceResponse>(`/chats/${chatId}/sources`);

  return res;
};
