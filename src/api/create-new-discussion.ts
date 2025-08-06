import { z } from "zod";
import { api } from "@/lib/api-client";
import { useMutation } from "@tanstack/react-query";
import { MutationConfig } from "@/lib/react-query";

export const createDiscussionSchema = z.object({
  title: z.string(),
});

export type CreateDiscussionInput = z.infer<typeof createDiscussionSchema>;

export const createDiscussion = (input: CreateDiscussionInput) => {
  return api.post<{ id: string }>("/discussions", input);
};

type UseCreateDiscussionOptions = {
  mutationConfig?: MutationConfig<typeof createDiscussion>;
};

export const useCreateDiscussion = ({
  mutationConfig,
}: UseCreateDiscussionOptions = {}) => {
  return useMutation({
    mutationFn: createDiscussion,
    ...mutationConfig,
  });
};
