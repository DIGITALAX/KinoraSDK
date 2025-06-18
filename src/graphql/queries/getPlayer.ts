import { FetchResult, gql } from "@apollo/client";
import { graphKinoraClient } from "./../client";

export const getCompletedMilestones = async (
  playerProfile: string,
  questId: number,
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
      query($playerProfile: String, $questId: Int, $contractAddress: String) {
          milestoneCompleteds(where: {questId: $questId, playerProfile: $playerProfile, contractAddress: $contractAddress}, orderBy: blockTimestamp) {
              milestone
          }
      }
    `),
    variables: { playerProfile, questId, contractAddress },
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

export const getCompletedQuests = async (
  playerProfile: string,
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
        query($playerProfile: String, $contractAddress: String) {
          questCompleteds(where: {playerProfile: $playerProfile, contractAddress: $contractAddress}, orderBy: blockTimestamp) {
              questId
          }
        }
      `),
    variables: { playerProfile, contractAddress },
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

export const getJoinedQuests = async (
  playerProfile: string,
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
          query($playerProfile: String, $contractAddress: String) {
            players(where: {playerProfile: $playerProfile, contractAddress: $contractAddress}) {
                questsJoined
            }
          }
        `),
    variables: { playerProfile, contractAddress },
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

export const getVideoMetricActivity = async (
  playerProfile: string,
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
            query($playerProfile: String, $contractAddress: String) {
              players(where: {playerProfile: $playerProfile, contractAddress: $contractAddress}) {
                videoActivities {
                    avd
                    duration
                    hasBookmarked
                    hasCommented
                    hasMirrored
                    hasQuoted
                    hasReacted
                    mostReplayedArea
                    playCount
                    playerProfile
                    postId
                    secondaryCollectOnComment
                    secondaryCollectOnQuote
                    secondaryCommentOnComment
                    secondaryCommentOnQuote
                    secondaryMirrorOnComment
                    secondaryMirrorOnQuote
                    secondaryQuoteOnComment
                    secondaryQuoteOnQuote
                    secondaryReactOnComment
                    secondaryReactOnQuote
                  }
              }
            }
          `),
    variables: { playerProfile, contractAddress },
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

export const getDetailsOfPlayer = async (
  playerProfile: string,
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
        query($playerProfile: String, $contractAddress: String) {
            players(where: {playerProfile: $playerProfile, $contractAddress: contractAddress}) {
                videos {
                    avd
                    duration
                    hasBookmarked
                    hasCommented
                    hasMirrored
                    hasQuoted
                    hasReacted
                    mostReplayedArea
                    playCount
                    playerProfile
                    postId
                    secondaryCollectOnComment
                    secondaryCollectOnQuote
                    secondaryCommentOnComment
                    secondaryCommentOnQuote
                    secondaryMirrorOnComment
                    secondaryMirrorOnQuote
                    secondaryQuoteOnComment
                    secondaryQuoteOnQuote
                    secondaryReactOnComment
                    secondaryReactOnQuote
                  }
                  questsJoined
                  questsCompleted
                  eligibile {
                    milestone
                    questId
                    status
                  }
                  milestonesCompleted {
                    questId
                    milestonesCompleted
                  }
            }
        }
    `),
    variables: { playerProfile, contractAddress },
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

export const getPlayersByQuest = async (
  questId: number,
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
          query($questId: Int, $contractAddress: String) {
            questInstantiateds(where: {questId: $questId, contractAddress: $contractAddress}) {
                players {
                  playerProfile
                }
              }
          }
      `),
    variables: { questId, contractAddress },
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

export const getQuests = async (): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`query {
            questInstantiateds {
              questId
            } 
          }
        `),
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

export const getQuestEnvoker = async (
  playerProfile: string,
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
    query($playerProfile: String, $contractAddress: String) {
        questInstantiateds(where: {playerProfile: $playerProfile, contractAddress: $contractAddress}) {
          questId
        } 
      }`),
    variables: { playerProfile, contractAddress },
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

export const getVideoMetrics = async (): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`query {
        videos {
            playerId
            postId
            questId
            quote
            react
            mirror
            minSecondaryReactOnQuote
            minSecondaryReactOnComment
            minSecondaryQuoteOnQuote
            minSecondaryQuoteOnComment
            minSecondaryMirrorOnComment
            minSecondaryMirrorOnQuote
            minSecondaryCommentOnQuote
            minSecondaryCommentOnComment
            minSecondaryCollectOnQuote
            minSecondaryCollectOnComment
            bookmark
            comment
            minAVD
            minDuration
            minPlayCount
          }
       }
          `),
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

export const getPlaybackIdQuests = async (
  playerId: string,
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`query($playerId: String, $contractAddress: String) {
        videos(where: {playerId: $playerId, contractAddress: $contractAddress}) {
            questId
          }
         }
            `),
    variables: {
      playerId,
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

export const getVideoIdQuests = async (
  postId: string,
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`query($postId: String, $contractAddress: String) {
          videos(where: {postId: $postId, contractAddress: $contractAddress}) {
              questId
            }
           }`),
    variables: {
      postId,
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

export const getActivityByPlayerId = async (
  playerId: string,
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
            query($playerId: String, $contractAddress: String) {
                videoActivities(where: {playerId: $playerId, contractAddress: $contractAddress}) {
                    avd
                    duration
                    hasBookmarked
                    hasCommented
                    hasMirrored
                    hasQuoted
                    hasReacted
                    mostReplayedArea
                    playCount
                    playerProfile
                    secondaryReactOnComment
                    secondaryReactOnQuote
                    secondaryQuoteOnQuote
                    postId
                    playerId
                    secondaryCollectOnComment
                    secondaryCollectOnQuote
                    secondaryCommentOnQuote
                    secondaryCommentOnComment
                    secondaryMirrorOnQuote
                    secondaryQuoteOnComment
                    secondaryMirrorOnComment
                  }
            }
        `),
    variables: { playerId, contractAddress },
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

export const getActivityByPostId = async (
  postId: string,
  contractAddress: string
): Promise<FetchResult | void> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const queryPromise = graphKinoraClient.query({
    query: gql(`
              query($postId: String, $contractAddress: String) {
                  videoActivities(where: {postId: $postId, contractAddress: $contractAddress}) {
                      avd
                      duration
                      hasBookmarked
                      hasCommented
                      hasMirrored
                      hasQuoted
                      hasReacted
                      mostReplayedArea
                      playCount
                      playerProfile
                      postId
                      secondaryReactOnComment
                      secondaryReactOnQuote
                      secondaryQuoteOnQuote
                      playerId
                      secondaryCollectOnComment
                      secondaryCollectOnQuote
                      secondaryCommentOnQuote
                      secondaryCommentOnComment
                      secondaryMirrorOnQuote
                      secondaryQuoteOnComment
                      secondaryMirrorOnComment
                    }
              }
          `),
    variables: { postId, contractAddress },
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
