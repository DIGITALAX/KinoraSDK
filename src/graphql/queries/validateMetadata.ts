import { FetchResult } from "@apollo/client";
import {
  ValidatePublicationMetadataDocument,
  ValidatePublicationMetadataQuery,
  ValidatePublicationMetadataRequest,
} from "./../../@types/generated";
import { client } from "./../client";

const validateMetadata = async (
  request: ValidatePublicationMetadataRequest,
): Promise<FetchResult<ValidatePublicationMetadataQuery>> => {
  return await client.query({
    query: ValidatePublicationMetadataDocument,
    variables: {
      request: request,
    },
    fetchPolicy: "no-cache",
  });
};
export default validateMetadata;
