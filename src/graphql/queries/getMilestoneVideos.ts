import { FetchResult, gql } from "@apollo/client";
import { graphKinoraClient } from "./../client";

export const getMilestoneVideos = async (
  questId: number,
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
      query($questId: Int, $contractAddress: String) {
        milestones(where: {questId: $questId, contractAddress: $contractAddress}, first: 1) {
            videos {
              react
              quote
              questId
              postId
              playerId
              mirror
              minSecondaryReactOnQuote
              minSecondaryReactOnComment
              minSecondaryQuoteOnComment
              minSecondaryQuoteOnQuote
              minSecondaryMirrorOnQuote
              minSecondaryMirrorOnComment
              minSecondaryCommentOnQuote
              minSecondaryCommentOnComment
              minSecondaryCollectOnQuote
              minSecondaryCollectOnComment
              minPlayCount
              minDuration
              minAVD
              comment
              bookmark
              factoryIds
            }
        }
      }
    `),
    variables: {
      questId,
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
