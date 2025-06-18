import {
  ApolloClient,
  ApolloError,
  NormalizedCacheObject,
} from "@apollo/client";
import {
  Post,
  PostReferencesQuery,
  PostReferencesRequest,
  WhoReferencedPostRequest
} from "@lens-protocol/client";

const getPublicationsReferences = async (
  request: PostReferencesRequest,
  playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>,
): Promise<{
  data: Post[] | null;
  error: ApolloError | undefined | null | unknown;
}> => {
  try {
    const result = await playerAuthedApolloClient.query({
      query: PostReferencesQuery,
      variables: {
        request,
      },
      fetchPolicy: "no-cache",
    });
    return { data: result.data?.value?.items as Post[], error: null };
  } catch (error) {
    console.error("Error fetching video data:", error);
    return { data: null, error };
  }
};
export default getPublicationsReferences;
