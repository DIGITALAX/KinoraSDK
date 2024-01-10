import {
    PublicationsDocument,
    PublicationsQuery,
    PublicationsRequest,
  } from "../../@types/generated";
  import {
    ApolloClient,
    ApolloError,
    NormalizedCacheObject,
  } from "@apollo/client";
  
  const getPublications = async (
    request: PublicationsRequest,
    playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>
  ): Promise<{
    data: PublicationsQuery | null;
    error: ApolloError | undefined | null | unknown;
  }> => {
    try {
      const result = await playerAuthedApolloClient.query({
        query: PublicationsDocument,
        variables: {
          request: request,
        },
        fetchPolicy: "no-cache",
      });
      return { data: result.data, error: null };
    } catch (error) {
      console.error("Error fetching video data:", error);
      return { data: null, error };
    }
  };
  export default getPublications;
  