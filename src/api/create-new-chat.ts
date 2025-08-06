import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { api } from "@/lib/api-client";
import { UseMutationOptions } from "@tanstack/react-query";
import { DocumentTypeEnum, LegalTextTypeEnum } from "@/types/enum";

export type MutationConfig<
  MutationFnType extends (arg: CreateChatInput) => Promise<{ id: string }>
> = UseMutationOptions<
  Awaited<ReturnType<MutationFnType>>,
  Error,
  Parameters<MutationFnType>[0]
>;

export const createChatInputSchema = z.object({
  question: z.string(),
  documentTypes: z.array(z.nativeEnum(DocumentTypeEnum)).optional(),
  legalSubjects: z.array(z.nativeEnum(LegalTextTypeEnum)).optional(),
  discussionId: z.string(),
  answer: z.any(),
  documents: z.any(),
});

export type CreateChatInput = z.infer<typeof createChatInputSchema>;

export const createChat = async (
  data: CreateChatInput
): Promise<{ id: string }> => {
  const response = await api.post<{ id: string }>(
    `/chats/${data.discussionId}`,
    data
  );
  return response;
};

type UseCreateChatOptions = {
  mutationConfig?: MutationConfig<typeof createChat>;
};

export const useCreateChatInDiscussion = ({
  mutationConfig,
}: UseCreateChatOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createChat,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["discussions"] });
      mutationConfig?.onSuccess?.(...args);
    },
    ...mutationConfig,
  });
};
