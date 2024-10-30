import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { marked } from 'marked';


const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
})

// Define the conversation handler for Bedrock's "converse" functionality
async function handleConversation(messages: any) {
    const modelId = "us.meta.llama3-2-11b-instruct-v1:0"; // Model ID

    const conversation = messages.map((message: any) => ({
        role: message.role,
        content: [{ 'text': message.content }]
    }));

    // Send the request to the Bedrock model
    const command = new ConverseCommand({
        modelId,
        messages: conversation,
        inferenceConfig: { maxTokens: 512, temperature: 0.5, topP: 0.9 },
    });
    const response = await client.send(command);
    const rawText = response.output?.message?.content?.[0].text ?? '';
    const responseText = marked.parse(rawText); // Converts MD to HTML

    const message = {
        id: crypto.randomUUID(), // or any unique ID generation method
        role: 'assistant',
        content: responseText
    };

    return message; // Return the properly formatted message
}

export async function POST(req: Request) {
    console.log("Received request");
    try {
        const { messages } = await req.json();
        console.log(messages);
        const response = await handleConversation(messages);

        return new Response(JSON.stringify(response));
    } catch (error) {
        console.error("Error during chat invocation:", error);
        return new Response(JSON.stringify({ error: "Failed to invoke Bedrock model" }), { status: 500 });
    }
}