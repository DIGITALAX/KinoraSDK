import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import {
  PostMutation,
  CreatePostRequest,
  PostResult,
  ConfigurePostActionRequest,
  ConfigurePostActionResult,
  ConfigurePostActionMutation,
} from "@lens-protocol/client";

const onChainPost = async (
  request: CreatePostRequest,
  questEnvokerAuthedClient: ApolloClient<NormalizedCacheObject>,
): Promise<PostResult> => {
  return (
    await questEnvokerAuthedClient.mutate({
      mutation: PostMutation,
      variables: {
        request,
      },
    })
  )?.data?.value as PostResult;
};

export default onChainPost;

