import { gql } from "@apollo/client";
import { authClient } from "../client";

export const COLLECTED = `query($pubId: PubId, $profileId: ProfileId) Publication {
    publication(request: {
      publicationId: "0x01-0x01"
    }) {
     __typename 
      ... on Post {
        hasCollectedByMe
      }
    }
  }`;

const getHasCollected = (pubId: string, profileId: string) => {
  return authClient.mutate({
    mutation: gql(COLLECTED),
    variables: {
      request: {
        pubId,
        profileId,
      },
    },
  });
};

export default getHasCollected;
