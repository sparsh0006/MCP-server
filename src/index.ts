import {
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    Account
  } from "@aptos-labs/ts-sdk";
  import { AgentRuntime, LocalSigner } from "move-agent-kit";
  import { MCPServer } from "move-agent-kit/dist/mcp";
  import dotenv from 'dotenv';
  import axios from 'axios';
  
  dotenv.config();
  
  // Configuration
  const COINPILOT_API = process.env.COINPILOT_API || 'http://localhost:8000/api';
  
  class CoinPilotDCAAgent {
    private agentRuntime: AgentRuntime;
    
    constructor(agentRuntime: AgentRuntime) {
      this.agentRuntime = agentRuntime;
    }
  
    // Method to create a DCA plan through the existing API
    async createDCAPlan(userId: string, amount: number, frequency: string, toAddress: string, riskLevel: string): Promise<any> {
      try {
        // Use the existing API to create a DCA plan
        const response = await axios.post(`${COINPILOT_API}/dca/plans`, {
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
      } catch (error: any) {
        console.error('Failed to create DCA plan:', error);
        return {
          status: 'error',
          message: error.message || 'Failed to create DCA plan'
        };
      }
    }
  
    // Method to stop a DCA plan
    async stopDCAPlan(planId: string): Promise<any> {
      try {
        const response = await axios.post(`${COINPILOT_API}/dca/plans/${planId}/stop`);
        
        return {
          status: 'success',
          plan: response.data,
          message: 'DCA plan stopped successfully'
        };
      } catch (error: any) {
        console.error('Failed to stop DCA plan:', error);
        return {
          status: 'error',
          message: error.message || 'Failed to stop DCA plan'
        };
      }
    }
  
    // Method to get user plans
    async getUserPlans(userId: string): Promise<any> {
      try {
        const response = await axios.get(`${COINPILOT_API}/dca/users/${userId}/plans`);
        
        return {
          status: 'success',
          plans: response.data
        };
      } catch (error: any) {
        console.error('Failed to get user plans:', error);
        return {
          status: 'error',
          message: error.message || 'Failed to get user plans'
        };
      }
    }
  
    // Method to get total investment
    async getUserTotalInvestment(userId: string): Promise<any> {
      try {
        const response = await axios.get(`${COINPILOT_API}/dca/users/${userId}/total-investment`);
        
        return {
          status: 'success',
          totalInvestment: response.data.totalInvestment
        };
      } catch (error: any) {
        console.error('Failed to get total investment:', error);
        return {
          status: 'error',
          message: error.message || 'Failed to get total investment'
        };
      }
    }
    
    // Method to get Joule pools using Move Agent Kit
    async getJoulePools(): Promise<any> {
      try {
        // Use the existing API endpoint to fetch Joule pools
        const response = await axios.get(`${COINPILOT_API}/pool/joule`);
        
        return {
          status: 'success',
          pools: response.data
        };
      } catch (error: any) {
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
        } catch (fallbackError: any) {
          console.error('Failed to get Joule pools:', fallbackError);
          return {
            status: 'error',
            message: fallbackError.message || 'Failed to get Joule pools'
          };
        }
      }
    }
    
    // Method to get Liquidswap pools using Move Agent Kit
    async getLiquidswapPools(): Promise<any> {
      try {
        // Use the existing API endpoint to fetch Liquidswap pools
        const response = await axios.get(`${COINPILOT_API}/pool/liquidswap`);
        
        return {
          status: 'success',
          pools: response.data
        };
      } catch (error: any) {
        // Fallback to direct API call if the endpoint fails
        try {
          const response = await axios.get(
            "https://api.liquidswap.com/pools/registered?networkId=1"
          );
          
          return {
            status: 'success',
            pools: response.data
          };
        } catch (fallbackError: any) {
          console.error('Failed to get Liquidswap pools:', fallbackError);
          return {
            status: 'error',
            message: fallbackError.message || 'Failed to get Liquidswap pools'
          };
        }
      }
    }
    
    // Method to get wallet balance
    async getWalletBalance(): Promise<any> {
      try {
        const balance = await this.agentRuntime.getBalance();
        
        return {
          status: 'success',
          balance
        };
      } catch (error: any) {
        console.error('Failed to get balance:', error);
        return {
          status: 'error',
          message: error.message || 'Failed to get balance'
        };
      }
    }
    
    // Method to get wallet address
    async getWalletAddress(): Promise<any> {
      try {
        const address = this.agentRuntime.account.getAddress().toString();
        
        return {
          status: 'success',
          address
        };
      } catch (error: any) {
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
    const aptosConfig = new AptosConfig({
      network: Network.MAINNET,
    });
    
    // Create Aptos client
    const aptos = new Aptos(aptosConfig);
    
    // Load private key from environment variables
    const privateKeyHex = process.env.APTOS_PRIVATE_KEY;
    if (!privateKeyHex) {
      throw new Error("APTOS_PRIVATE_KEY environment variable not set");
    }
    
    // Create private key and account
    const privateKey = new Ed25519PrivateKey(privateKeyHex);
    const account = Account.fromPrivateKey({ privateKey });
    
    // Initialize signer and agent runtime
    const signer = new LocalSigner(account, Network.MAINNET);
    const agentRuntime = new AgentRuntime(signer, aptos);
    
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
    const server = new MCPServer("coinpilot-dca-agent", extendedAgentRuntime);
    server.start();
    
    console.log("CoinPilot DCA MCP Server started successfully.");
  }
  
  main().catch((error) => {
    console.error("Failed to start MCP Server:", error);
    process.exit(1);
  });