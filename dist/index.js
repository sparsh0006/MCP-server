"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts_sdk_1 = require("@aptos-labs/ts-sdk");
const move_agent_kit_1 = require("move-agent-kit");
const mcp_1 = require("move-agent-kit/dist/mcp");
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
// Configuration
const COINPILOT_API = process.env.COINPILOT_API || 'http://localhost:8000/api';
class CoinPilotDCAAgent {
    constructor(agentRuntime) {
        this.agentRuntime = agentRuntime;
    }
    // Method to create a DCA plan through the existing API
    async createDCAPlan(userId, amount, frequency, toAddress, riskLevel) {
        try {
            // Use the existing API to create a DCA plan
            const response = await axios_1.default.post(`${COINPILOT_API}/dca/plans`, {
                userId,
                amount,
                frequency,
                toAddress,
                riskLevel
            });
            return {
                status: 'success',
                planId: response.data._id || response.data.id,
                message: 'DCA plan created successfully'
            };
        }
        catch (error) {
            console.error('Failed to create DCA plan:', error);
            return {
                status: 'error',
                message: error.message || 'Failed to create DCA plan'
            };
        }
    }
    // Method to stop a DCA plan
    async stopDCAPlan(planId) {
        try {
            const response = await axios_1.default.post(`${COINPILOT_API}/dca/plans/${planId}/stop`);
            return {
                status: 'success',
                plan: response.data,
                message: 'DCA plan stopped successfully'
            };
        }
        catch (error) {
            console.error('Failed to stop DCA plan:', error);
            return {
                status: 'error',
                message: error.message || 'Failed to stop DCA plan'
            };
        }
    }
    // Method to get user plans
    async getUserPlans(userId) {
        try {
            const response = await axios_1.default.get(`${COINPILOT_API}/dca/users/${userId}/plans`);
            return {
                status: 'success',
                plans: response.data
            };
        }
        catch (error) {
            console.error('Failed to get user plans:', error);
            return {
                status: 'error',
                message: error.message || 'Failed to get user plans'
            };
        }
    }
    // Method to get total investment
    async getUserTotalInvestment(userId) {
        try {
            const response = await axios_1.default.get(`${COINPILOT_API}/dca/users/${userId}/total-investment`);
            return {
                status: 'success',
                totalInvestment: response.data.totalInvestment
            };
        }
        catch (error) {
            console.error('Failed to get total investment:', error);
            return {
                status: 'error',
                message: error.message || 'Failed to get total investment'
            };
        }
    }
    // Method to get Joule pools using Move Agent Kit
    async getJoulePools() {
        try {
            // Use the existing API endpoint to fetch Joule pools
            const response = await axios_1.default.get(`${COINPILOT_API}/pool/joule`);
            return {
                status: 'success',
                pools: response.data
            };
        }
        catch (error) {
            // Fallback to Move Agent Kit if API fails
            try {
                // This uses a direct blockchain call with move-agent-kit
                const allPoolDetailsResponse = await fetch("https://price-api.joule.finance/api/market");
                if (!allPoolDetailsResponse.ok) {
                    throw new Error(`API request failed with status: ${allPoolDetailsResponse.status}`);
                }
                const allPoolDetails = await allPoolDetailsResponse.json();
                return {
                    status: 'success',
                    pools: allPoolDetails.data
                };
            }
            catch (fallbackError) {
                console.error('Failed to get Joule pools:', fallbackError);
                return {
                    status: 'error',
                    message: fallbackError.message || 'Failed to get Joule pools'
                };
            }
        }
    }
    // Method to get Liquidswap pools using Move Agent Kit
    async getLiquidswapPools() {
        try {
            // Use the existing API endpoint to fetch Liquidswap pools
            const response = await axios_1.default.get(`${COINPILOT_API}/pool/liquidswap`);
            return {
                status: 'success',
                pools: response.data
            };
        }
        catch (error) {
            // Fallback to direct API call if the endpoint fails
            try {
                const response = await axios_1.default.get("https://api.liquidswap.com/pools/registered?networkId=1");
                return {
                    status: 'success',
                    pools: response.data
                };
            }
            catch (fallbackError) {
                console.error('Failed to get Liquidswap pools:', fallbackError);
                return {
                    status: 'error',
                    message: fallbackError.message || 'Failed to get Liquidswap pools'
                };
            }
        }
    }
    // Method to get wallet balance
    async getWalletBalance() {
        try {
            const balance = await this.agentRuntime.getBalance();
            return {
                status: 'success',
                balance
            };
        }
        catch (error) {
            console.error('Failed to get balance:', error);
            return {
                status: 'error',
                message: error.message || 'Failed to get balance'
            };
        }
    }
    // Method to get wallet address
    async getWalletAddress() {
        try {
            const address = this.agentRuntime.account.getAddress().toString();
            return {
                status: 'success',
                address
            };
        }
        catch (error) {
            console.error('Failed to get wallet address:', error);
            return {
                status: 'error',
                message: error.message || 'Failed to get wallet address'
            };
        }
    }
}
async function main() {
    // Initialize Aptos configuration
    const aptosConfig = new ts_sdk_1.AptosConfig({
        network: ts_sdk_1.Network.MAINNET,
    });
    // Create Aptos client
    const aptos = new ts_sdk_1.Aptos(aptosConfig);
    // Load private key from environment variables
    const privateKeyHex = process.env.APTOS_PRIVATE_KEY;
    if (!privateKeyHex) {
        throw new Error("APTOS_PRIVATE_KEY environment variable not set");
    }
    // Create private key and account
    const privateKey = new ts_sdk_1.Ed25519PrivateKey(privateKeyHex);
    const account = ts_sdk_1.Account.fromPrivateKey({ privateKey });
    // Initialize signer and agent runtime
    const signer = new move_agent_kit_1.LocalSigner(account, ts_sdk_1.Network.MAINNET);
    const agentRuntime = new move_agent_kit_1.AgentRuntime(signer, aptos);
    // Create DCA agent
    const dcaAgent = new CoinPilotDCAAgent(agentRuntime);
    // Extend the agent runtime with DCA-specific methods
    const extendedAgentRuntime = {
        ...agentRuntime,
        createDCAPlan: dcaAgent.createDCAPlan.bind(dcaAgent),
        stopDCAPlan: dcaAgent.stopDCAPlan.bind(dcaAgent),
        getUserPlans: dcaAgent.getUserPlans.bind(dcaAgent),
        getUserTotalInvestment: dcaAgent.getUserTotalInvestment.bind(dcaAgent),
        getJoulePools: dcaAgent.getJoulePools.bind(dcaAgent),
        getLiquidswapPools: dcaAgent.getLiquidswapPools.bind(dcaAgent),
        getWalletBalance: dcaAgent.getWalletBalance.bind(dcaAgent),
        getWalletAddress: dcaAgent.getWalletAddress.bind(dcaAgent)
    };
    // Start MCP server
    const server = new mcp_1.MCPServer("coinpilot-dca-agent", extendedAgentRuntime);
    server.start();
    console.log("CoinPilot DCA MCP Server started successfully.");
}
main().catch((error) => {
    console.error("Failed to start MCP Server:", error);
    process.exit(1);
});
