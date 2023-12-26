import { lensClient } from "./../client";
import {
  PublicationDocument,
  PublicationQuery,
  PublicationRequest,
} from "./../../@types/generated";
import { ApolloError } from "@apollo/client";

const getPublicationClient = async (
  request: PublicationRequest,
): Promise<{
  data: PublicationQuery | null;
  error: ApolloError | undefined  | null | unknown;
}> => {
  try {
    const result = await lensClient.query({
      query: PublicationDocument,
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
export default getPublicationClient;
