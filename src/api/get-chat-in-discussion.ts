import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { ChatResponse } from "@/types/api";

export const getChat = async ({
  discussionId,
  pageParam = 1,
}: {
  discussionId: string;
  pageParam: number;
}): Promise<ChatResponse> => {
  const res = await api.get<ChatResponse>(
    `/discussions/${discussionId}/chats`,
    { params: { page: pageParam, limit: 10 } }
  );

  return res;
};

export const getChatQueryOptions = (discussionId: string) => {
  return {
    queryKey: ["chats", discussionId],
    queryFn: ({ pageParam = 1 }) => getChat({ discussionId, pageParam }),
    getNextPageParam: (lastPage: ChatResponse) => {
      const hasMore = lastPage.data.length === lastPage.limit;
      const nextPage = hasMore ? lastPage.page + 1 : undefined;
      return nextPage;
    },
    enabled: Boolean(discussionId),
    initialPageParam: 1,
  };
};

export const useChat = ({ discussionId }: { discussionId: string }) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
  } = useInfiniteQuery(getChatQueryOptions(discussionId));

  return {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
  };
};
