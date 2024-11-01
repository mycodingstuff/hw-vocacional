/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { marked } from 'marked';
import reference from './reference.json';

const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
})
const modelId = "us.meta.llama3-2-11b-instruct-v1:0"; // Model ID

let studentProfile: any = {
    "Language": null,
    "Name": null,
    "ScholarYear": null,
    "Location": null,
    "Age": null,
    "Gender": null,
    "Economy": null,
    
    "CognitiveSkills": [],
    "Interests": [],
    "SoftSkills": [],
    "FavoriteSubjects": [],
    "WorkPreferences": [],
    "EconomicConstraints": [],
    "LearningStyle": [],
    "TechnologicalAffinity": []
};
let questionsMade: string[] = [];
let recommendationGiven: boolean = false;

function missingAspects() {
    let aspectKey = null;
    for (const [key, value] of Object.entries(studentProfile)) {
        if (Array.isArray(value) && value.length < 2) {
            aspectKey = key;
            break;
        }
        if (value === null || value === undefined || value === '') {
            aspectKey = key;
            break;
        }
    }
    return aspectKey;
}

async function basicProfileEvaluation(userText: string, missingAspect: string) {
    const instructions: any[] = [{
        role: "user",
        content: [{'text':
            "You are a text analyzer. You are given a system question and a user answer, and you need to analyze"+
            " the text and extract from the user answer the information that fits to the following aspects \n"+
            JSON.stringify(studentProfile)+
            "\n For this extraction try to focus on the information related to: "+missingAspect+
            "\n\n Here you have the information to analyze \n"+userText+
            "\n\n For your response, reply with a json format text copying the aspects presented before, keep the"+
            " values that are already established and append to the lists the new values recognized in the user response"+
            "\n the values for name, location, language, gender, age and economy are strings, update them if the user answer give a new value"+
            "\n Give me just the json profile with the new values. You are forbidden to add any details, comments, or markdown formatting"}]
    
            // },{
    //     role: "assistant",
    //     content: [{"text":"Great, please provide the text you want me to analyze."}]
    // },{
    //     role: "user",
    //     content: [{"text":"Here is the text: " + userText + 
    //     "\n\n First, if this Q/A fits to one or more of the following profile aspects, please provide the new profile status by updating the values. Add the value just if the user answer give a positive answer."+
    //     "and try to focus on the aspect: "+missingAspect+
    //     JSON.stringify(studentProfile)+
    //     "\nDon't remove the values that are already present, just update the ones that are changed. In case of the lists, append the values to the existing ones."+
    //     "\nGive me just the json profile with the new values. You are forbidden to add any details or comments, I need just the values in the json object"}]
    }]
    const command = new ConverseCommand({
        modelId,
        messages: instructions,
        inferenceConfig: { maxTokens: 512, temperature: 0.5, topP: 0.9 },
    });

    let response = await client.send(command);
    console.log("Model response success");
    let assistantMessage = response.output?.message;
    if (!assistantMessage) {
        return null;
    }
    let rawText = assistantMessage.content?.[0].text ?? '';
    rawText = rawText.replaceAll("'", '"');
    while ((rawText.match(/{/g) || []).length > 1 && (rawText.match(/}/g) || []).length > 1) {
        console.log("Re evaluating the profile");
        response = await client.send(command);
        assistantMessage = response.output?.message;
        if (!assistantMessage) {
            return null;
        }
        rawText = assistantMessage.content?.[0].text ?? '';
        rawText = rawText.replaceAll("'", '"');
    }
    rawText = rawText.substring(rawText.indexOf("{"), rawText.lastIndexOf("}") + 1);
    if (assistantMessage.content && assistantMessage.content[0]) {
        assistantMessage.content[0].text = rawText;
    }
    instructions.push(assistantMessage);
    console.log("Raw text: ", rawText);
    const evaluation = JSON.parse(rawText);

    for (const aspect in evaluation) {
        if (evaluation[aspect] != null) {
            studentProfile[aspect] = evaluation[aspect];
        }
    }
    const missing = missingAspects();
    if(missing == null){
        return {
            "evaluation": evaluation,
            "question": "I have no more questions for you, let's start with the career guidance."
        };
    }
    instructions.push({
        role: "user",
        content: [{"text":"Perfect, now for getting more info, I need you to take a question for "+
            "one of the aspects that are lacking in the evaluation. I just need the question, don't add details."+
            "\nIn this case, the aspect that is lacking is: "+missing+
            "\nHere you have the reference of the aspects, take one of the possible questions: "+JSON.stringify(reference[missing as keyof typeof reference])+
            "\nAnd don't repeat this questions: " + questionsMade.join("\n -")
        }]
    });
    const suggestionsResponse = await client.send(command);
    const question = suggestionsResponse.output?.message?.content?.[0].text ?? '';
    console.log("Missing aspect: ", missing, " - question: ", question);
    console.log("Questions reference: ", reference[missing as keyof typeof reference]);
    questionsMade.push(question);
    const evaluationResult = {
        "evaluation": evaluation,
        "question": question
    };
    return evaluationResult;
}

async function createProfileAspects() {
    let AspectsScores: any = {};
    for (const area in reference) {
        AspectsScores[area] = Object.keys(reference[area as keyof typeof reference]);
    }
    const instructions: any[] = [{
        role: "user",
        content: [{"text":"You are a psychologist that can help with vocational guidance. You are given with a student profile, "+
            "and you need to provide a effective evaluation of different aspects that I will give you. "+
            "\nHere you have the profile: "+JSON.stringify(studentProfile)+
            "\nAnd the aspects that you need to evaluate: "+JSON.stringify(AspectsScores)+
            "\n\nFor your evaluation, take each aspect and score it from 0 to 10, based on the profile of the student. "+
            "\nGive me just a json object with the evaluation of the aspects. You are forbidden to add any details or comments, I need just the values in the json object"}]
    }]
    const command = new ConverseCommand({
        modelId,
        messages: instructions,
        inferenceConfig: { maxTokens: 1024, temperature: 0.5, topP: 0.9 },
    });
    const response = await client.send(command);
    let rawText = response.output?.message?.content?.[0].text ?? '';
    rawText = rawText.substring(rawText.indexOf("{"), rawText.lastIndexOf("}") + 1);
    const aspectsEvaluation = JSON.parse(rawText);
    
    return aspectsEvaluation;
}
// Define the conversation handler for Bedrock's "converse" functionality
async function handleConversation(messages: any, question: string) {
    
    // Add initial context message to guide the LLM's behavior
    const systemContext = {
        role: "user",
        content: [{ 'text': "You are an AI assistant specialized in vocational guidance for students. Your goal is to help students explore their interests, skills, and career aspirations through conversation."+
            "\n here you have the current profile of the student: "+JSON.stringify(studentProfile)
        }]
    };

    const conversation = messages.map((message: any) => ({
        role: message.role,
        content: [{ 'text': message.content }]
    }));

    const userAnswer = conversation.slice(-1)[0].content[0].text;
    conversation[conversation.length - 1].content = [{'text': "User answer: " + userAnswer+
        "\n\nAnswer to the user in a brief tone, and you can continue with the question: '" + question+"'.\n"+
        "If the question is personal, be careful with the tone and try to avoid being too intrusive. Example: “I'd also like to know, how do you identify in terms of gender? Feel free to share however you're comfortable!”"+
        "Remember you are talking with the user, so act naturally and answer to the user with the provided question. Be as short and concise as possible."
    }];
    // Send the request to the Bedrock model
    const command = new ConverseCommand({
        modelId,
        messages: [systemContext, ...conversation],
        inferenceConfig: { maxTokens: 512, temperature: 0.5, topP: 0.9 },
    });
    const response = await client.send(command);
    const rawText = response.output?.message?.content?.[0].text ?? '';
    const message = marked.parse(rawText); // Converts MD to HTML
    return message; // Return the properly formatted message
}

async function suggestCareers(messages: any[], aspectScores: any) {
    const conversation = messages.map((message: any) => ({
        role: message.role,
        content: [{ 'text': message.content }]
    }));
    const instructions :any[] = [
        {
            role: "assistant",
            content: [{ 'text': "Ok, based in all the information you have, here you have a summary of the evaluation of the aspects: "+
                JSON.stringify(aspectScores)+
                "Does this summary fit to your profile?"
            }]
        },{
        role: "user",
        content: [{ 'text': 
            "Yes, it's perfects! Now based in that summary, provide a brief summary of the evaluation and suggest 3-5 potential career paths that would be a good match." +
            "\nFocus on careers that align with my strongest aspects." +
            "\nKeep the response concise but informative, using bullet points for the career suggestions." +
            "\nFormat the response in markdown. Give your answer in "+studentProfile.Language
        }]
    }];

    const command = new ConverseCommand({
        modelId,
        messages: [...conversation, ...instructions],
        inferenceConfig: { maxTokens: 1024, temperature: 0.7, topP: 0.9 },
    });

    const response = await client.send(command);
    const rawText = response.output?.message?.content?.[0].text ?? '';
    return marked.parse(rawText); // Convert markdown to HTML
}

async function chat(messages: any[]) {
    const conversation = messages.map((message: any) => ({
        role: message.role,
        content: [{ 'text': message.content }]
    }));
    conversation[conversation.length - 1].content[0].text += "\n\n Give your answer in "+studentProfile.Language+" and be concise, format your answer with html tags.";
    const command = new ConverseCommand({
        modelId,
        messages: conversation,
        inferenceConfig: { maxTokens: 512, temperature: 0.5, topP: 0.9 },
    });
    const response = await client.send(command);
    const rawText = response.output?.message?.content?.[0].text ?? '';
    const message = marked.parse(rawText); // Converts MD to HTML
    return message;
}

export async function POST(req: Request) {
    const message = {
        id: crypto.randomUUID(), // or any unique ID generation method
        role: 'assistant',
        content: ''
    };
    try {
        const { messages } = await req.json();
        const lastTwoMessages = messages.slice(-2);
        
        const userQA = `Question: ${lastTwoMessages[0].content}\n >>User Answer: ${lastTwoMessages[1].content}`;
        const missing = missingAspects();
        console.log("Missing aspect: ", missing);
        if(missing == null) {
            if(!recommendationGiven){   
                // evaluation of career traits
                const aspectsEvaluation = await createProfileAspects();
                console.log("Aspects evaluation: ", aspectsEvaluation);

                message.content = await suggestCareers(messages.slice(-7), aspectsEvaluation);  
                recommendationGiven = true;
            }else{
                message.content = await chat(messages.slice(-11));
            }
        }else{
            // ask for basic information
            const evaluation = await basicProfileEvaluation(userQA, missing);
            if (!evaluation) {
                message.content = "Sorry, I didn't understand your response, can you give me more details.";
                return new Response(JSON.stringify({"message": message, "evaluation": null, "profile": studentProfile}), { status: 200 });
            }
            message.content = await handleConversation(messages.slice(-4), evaluation['question']);
        }
        
        
        return new Response(JSON.stringify({"message": message, "evaluation": null, "profile": studentProfile}));
    } catch (error) {
        message.content = 'An error occurred while processing your request. Please try again later.';
        console.error("Error during chat invocation:", error);
        return new Response(JSON.stringify({"message": message, "evaluation": null, "profile": studentProfile}), { status: 500 });
    }
}