import { FetchResult, gql } from "@apollo/client";
import { graphKinoraClient } from "./../client";

export const getPlayerVideoData = async (
  pubId: number,
  profileId: number,
  playerProfileId: number,
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
      query($pubId: Int, $profileId: Int, $playerProfileId: Int, $contractAddress: String) {
        videoActivities(where: {profileId: $profileId, pubId: $pubId, playerProfileId: $playerProfileId, contractAddress: $contractAddress}, first: 1) {
            secondaryCollectOnComment
            secondaryCollectOnQuote
            secondaryCommentOnQuote
            secondaryCommentOnComment
            secondaryMirrorOnComment
            secondaryMirrorOnQuote
            secondaryQuoteOnComment
            secondaryQuoteOnQuote
            secondaryReactOnQuote
            secondaryReactOnComment
            hasReacted
            hasQuoted
            hasMirrored
            hasCommented
            hasBookmarked
            duration
            avd
            playCount
          }
      }
    `),
    variables: {
      pubId,
      profileId,
      playerProfileId,
      contractAddress,
    },
    fetchPolicy: "no-cache",
    errorPolicy: "all",
  });

  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({ timedOut: true });
    }, 60000);
    return () => clearTimeout(timeoutId);
  });

  const result: any = await Promise.race([queryPromise, timeoutPromise]);

  timeoutId && clearTimeout(timeoutId);
  if (result.timedOut) {
    return;
  } else {
    return result;
  }
};
