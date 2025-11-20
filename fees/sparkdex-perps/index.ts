import { gql, request } from "graphql-request";
import { Adapter } from "../../adapters/types";
import { CHAIN } from "../../helpers/chains";
import { getTimestampAtStartOfDayUTC } from "../../utils/date";

const endpoint = "https://api.goldsky.com/api/public/project_cm1tgcbwdqg8b01un9jf4a64o/subgraphs/sparkdex-trade/latest/gn";

interface IFeeStat {
  cumulativeFeeUsd: string;
  feeUsd: string;
  id: string;
}

interface ITradingStat {
  fundingFeeUsd: string;
  id: string;
}

const fetch = async (timestamp: number) => {
  const todaysTimestamp = getTimestampAtStartOfDayUTC(timestamp);
  const period = "daily";

  const graphQuery = gql`{
    feeStats(where: {timestamp: ${todaysTimestamp}, period: "${period}"}) {
      id
      timestamp
      period
      cumulativeFeeUsd
      feeUsd
    }
    tradingStats(where: {timestamp: ${todaysTimestamp}, period: "${period}"}) {
      id
      fundingFeeUsd
    }
  }`;

  const response = await request(endpoint, graphQuery);
  const feeStats: IFeeStat[] = response.feeStats;
  const tradingStats: ITradingStat[] = response.tradingStats;

  let dailyFeeUSD = BigInt(0);
  let dailyFundingFeeUSD = BigInt(0);

  // Sum up trading fees from feeStats
  feeStats.forEach((fee) => {
    dailyFeeUSD += BigInt(fee.feeUsd);
  });

  // Sum up funding fees from tradingStats
  tradingStats.forEach((stat) => {
    dailyFundingFeeUSD += BigInt(stat.fundingFeeUsd);
  });

  // Total fees = trading fees + funding fees
  const totalFeeUSD = dailyFeeUSD + dailyFundingFeeUSD;
  const finalDailyFee = parseInt(totalFeeUSD.toString()) / 1e18;

  // Revenue calculations
  // Revenue = total fees
  const finalDailyRevenue = finalDailyFee;
  
  // Protocol revenue = 60% of revenue
  const finalDailyProtocolRevenue = finalDailyRevenue * 0.6;
  
  // Supply side revenue = 40% of revenue
  const finalDailySupplySideRevenue = finalDailyRevenue * 0.4;

  return {
    timestamp: todaysTimestamp,
    dailyFees: finalDailyFee,
    dailyRevenue: finalDailyRevenue,
    dailyProtocolRevenue: finalDailyProtocolRevenue,
    dailySupplySideRevenue: finalDailySupplySideRevenue,
  };
};

const adapter: Adapter = {
  version: 1,
  adapter: {
    [CHAIN.FLARE]: {
      fetch,
    },
  },
  start: '2024-11-05',
  methodology: {
    Fees: "Trading fees and funding fees collected from users on SparkDEX perpetual markets",
    Revenue: "Total revenue equals total fees collected",
    ProtocolRevenue: "60% of total revenue goes to the protocol",
    SupplySideRevenue: "40% of total revenue goes to liquidity providers",
  },
};

export default adapter;

