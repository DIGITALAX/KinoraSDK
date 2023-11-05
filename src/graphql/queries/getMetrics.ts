import { PlayerMetricsResult } from "src/@types/kinora-sdk";
import { graphClient } from "./../client";
import { ApolloError, gql } from "@apollo/client";

const METRICS_QUERY = `query($where: request) {
    playerMetricsUpdateds(where: $where) {
        profileId
        playerProfileId
        playbackId
        encrypted
        json
        rawTotalDuration
        rawPlayCount
        rawPauseCount
        rawSkipCount
        rawClickCount
        rawImpressionCount
        rawBounceCount
        rawBounceRate
        rawVolumeChangeCount
        rawFullScreenCount
        rawBufferCount
        rawInteractionRate
        rawPreferredTimeToWatch
        rawMostViewedSegment
        rawBufferDuration
        rawEngagementRate
        rawMostReplayedArea
        rawPlayPauseRatio
        rawCtr
        rawAvd
        totalViewDuration
        totalFullScreenCount
        totalPlayCount
        totalPauseCount
        totalSkipCount
        totalClickCount
        totalVolumeChangeCount
        totalBufferCount
        averageBounceRate
        averageBufferDuration
        averageEngagementRate
        averagePlayPauseRatio
        averageCtr
        averageAvd
        hasQuoted
        hasMirrored
        hasReacted
        hasBookmarked
        hasNotInterested
        hasActed
        globalAverageRawTotalDuration
        globalAverageRawPlayCount
        globalAverageRawPauseCount
        globalAverageRawSkipCount
        globalAverageRawClickCount
        globalAverageRawImpressionCount
        globalAverageRawBounceCount
        globalAverageRawBounceRate
        globalAverageRawVolumeChangeCount
        globalAverageRawFullScreenCount
        globalAverageRawBufferCount
        globalAverageRawInteractionRate
        globalAverageRawPreferredTimeToWatch
        globalAverageRawMostViewedSegment
        globalAverageRawBufferDuration
        globalAverageRawEngagementRate
        globalAverageRawMostReplayedArea
        globalAverageRawPlayPauseRatio
        globalAverageRawCtr
        globalAverageRawAvd
        globalAverageTotalViewDuration
        globalAverageTotalFullScreenCount
        globalAverageTotalPlayCount
        globalAverageTotalPauseCount
        globalAverageTotalSkipCount
        globalAverageTotalClickCount
        globalAverageTotalVolumeChangeCount
        globalAverageTotalBufferCount
        globalAverageAverageBounceRate
        globalAverageAverageBufferDuration
        globalAverageAverageEngagementRate
        globalAverageAveragePlayPauseRatio
        globalAverageAverageCtr
        globalAverageAverageAvd
        globalAverageHasQuoted
        globalAverageHasMirrored
        globalAverageHasReacted
        globalAverageHasBookmarked
        globalAverageHasNotInterested
        globalAverageHasActed
        internalAverageRawTotalDuration
        internalAverageRawPlayCount
        internalAverageRawPauseCount
        internalAverageRawSkipCount
        internalAverageRawClickCount
        internalAverageRawImpressionCount
        internalAverageRawBounceCount
        internalAverageRawBounceRate
        internalAverageRawVolumeChangeCount
        internalAverageRawFullScreenCount
        internalAverageRawBufferCount
        internalAverageRawInteractionRate
        internalAverageRawPreferredTimeToWatch
        internalAverageRawMostViewedSegment
        internalAverageRawBufferDuration
        internalAverageRawEngagementRate
        internalAverageRawMostReplayedArea
        internalAverageRawPlayPauseRatio
        internalAverageRawCtr
        internalAverageRawAvd
        internalAverageTotalViewDuration
        internalAverageTotalFullScreenCount
        internalAverageTotalPlayCount
        internalAverageTotalPauseCount
        internalAverageTotalSkipCount
        internalAverageTotalClickCount
        internalAverageTotalVolumeChangeCount
        internalAverageTotalBufferCount
        internalAverageAverageBounceRate
        internalAverageAverageBufferDuration
        internalAverageAverageEngagementRate
        internalAverageAveragePlayPauseRatio
        internalAverageAverageCtr
        internalAverageAverageAvd
        internalAverageHasQuoted
        internalAverageHasMirrored
        internalAverageHasReacted
        internalAverageHasBookmarked
        internalAverageHasNotInterested
        internalAverageHasActed
    }
  }`;

const getMetrics = async (request: {
  questEnvokerProfileId?: number;
  playerProfileId?: number;
  playbackId?: string;
  encrypted?: boolean;
}): Promise<{
  data: PlayerMetricsResult[];
  error: ApolloError | undefined;
}> => {
  try {
    const result = await graphClient.query({
      query: gql(METRICS_QUERY),
      variables: {
        request: request,
      },
      fetchPolicy: "no-cache",
    });
    return { data: result.data.playerMetricsUpdateds, error: null };
  } catch (error) {
    console.error("Error fetching video data:", error);
    return { data: null, error };
  }
};
export default getMetrics;
