import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Anthropic } from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import * as readline from "node:readline/promises";

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
}

class MCPClient {
    private mcp: Client;
    private llm: Anthropic;
    private transport: SSEClientTransport | null = null;
    private tools: Array<{ name: string; description: string }> = [];

    constructor() {
        this.llm = new Anthropic({
            apiKey: ANTHROPIC_API_KEY,
        });
        this.mcp = new Client(
            { name: "mcp-client-cli", version: "1.0.0" },
            {
                capabilities: {
                    prompts: {},
                    resources: {
                        schemes: ["https"]
                    },
                    tools: {}
                }
            }
        );
    }

    async connectToMCP() {
        try {
            // Create SSE transport pointing to your server
            this.transport = new SSEClientTransport(new URL("http://localhost:3030/sse"));
            await this.mcp.connect(this.transport);
            console.log("Connected to MCP server successfully!");

            // List available tools
            const toolsResult = await this.mcp.listTools();
            this.tools = toolsResult.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
            }));
            console.log("Available tools:", this.tools);
        } catch (error) {
            console.error("Error connecting to MCP:", error);
            throw error;
        }
    }

    extractFileKey(figmaUrl: string): string {
        // Normalize the URL to handle cases without https:// or www.
        const normalizedUrl = figmaUrl.replace(/^(https?:\/\/)?(www\.)?/, '');
        const match = normalizedUrl.match(/figma\.com\/(file|design)\/([^/?]+)/);
        if (!match) {
            throw new Error("Invalid Figma URL format");
        }
        return match[2];
    }

    extractNodeId(figmaUrl: string): string | undefined {
        const match = figmaUrl.match(/node-id=([^&]+)/);
        return match ? match[1] : undefined;
    }

    extractDepth(figmaUrl: string): number | undefined {
        // Look for the last number after a hyphen in the URL
        const match = figmaUrl.match(/-(\d+)(?=[^-]*$)/);
        if (match) {
            const depth = parseInt(match[1], 10);
            // Validate that depth is a reasonable number (1-10)
            if (depth >= 1 && depth <= 10) {
                return depth;
            }
        }
        // Default depth if not found or invalid
        return undefined;
    }

    async convertFigmaDesign(figmaUrl: string) {
        try {
            console.log(`Converting Figma URL: ${figmaUrl}`);
            
            const fileKey = this.extractFileKey(figmaUrl);
            const nodeId = this.extractNodeId(figmaUrl);
            const depth = this.extractDepth(figmaUrl);
            
            console.log(`File key: ${fileKey}, Node ID: ${nodeId}, Depth: ${depth}`);
            
            // Call the get_figma_data tool
            const toolArgs = {
                fileKey,
                ...(nodeId ? { nodeId } : {}),
                ...(depth ? { depth } : {})
            };
            console.log("Calling get_figma_data with arguments:", toolArgs);
            
            const result = await this.mcp.callTool({
                name: "get_figma_data",
                arguments: toolArgs
            });
            
            return result;
        } catch (error) {
            if (error instanceof Error) {
                console.error("Error converting Figma design:", {
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                });
            } else {
                console.error("Error converting Figma design (non-Error object):", error);
            }
            throw error;
        }
    }

    async chatLoop() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        try {
            while (true) {
                const figmaUrl = await rl.question("\nEnter a Figma URL (or 'exit' to quit): ");
                if (figmaUrl.toLowerCase() === 'exit') {
                    break;
                }

                const result = await this.convertFigmaDesign(figmaUrl);
                console.log("\nConversion result:", result);
            }
        } catch (error) {
            console.error("Error in chat loop:", error);
        } finally {
            rl.close();
        }
    }
}

async function main() {
    const client = new MCPClient();
    try {
        await client.connectToMCP();
        await client.chatLoop();
    } catch (error) {
        console.error("Fatal error:", error);
        process.exit(1);
    }
}

main().catch(console.error);