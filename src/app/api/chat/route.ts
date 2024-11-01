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

function missingAspects(studentProfile: any) {
    let aspectKey = null;
    for (const [key, value] of Object.entries(studentProfile)) {
        if (Array.isArray(value) && value.length == 0) {
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

async function basicProfileEvaluation(userText: string, missingAspect: string, studentProfile: any) {
    const instructions: any[] = [{
        role: "user",
        content: [{
            'text':
                "You are a text analyzer. You are given a system question and a user answer, and you need to analyze" +
                " the text and extract from the user answer the information that fits to the following aspects \n" +
                JSON.stringify(studentProfile) +
                "\n For this extraction try to focus on the information related to: " + missingAspect +
                "\n\n Here you have the information to analyze \n" + userText +
                "\n\n For your response, reply with a json format text copying the aspects presented before, keep the" +
                " values that are already established and append to the lists the new values recognized in the user response" +
                "\n the values for name, location, language, gender, age and economy are strings, update them if the user answer give a new value" +
                "\n Give me just the json profile with the new values. You are forbidden to add any details, comments, or markdown formatting"
        }]

    }];
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
    // while ((rawText.match(/{/g) || []).length > 1 && (rawText.match(/}/g) || []).length > 1) {
    //     console.log("Re evaluating the profile");
    //     response = await client.send(command);
    //     assistantMessage = response.output?.message;
    //     if (!assistantMessage) {
    //         return null;
    //     }
    //     rawText = assistantMessage.content?.[0].text ?? '';
    //     rawText = rawText.replaceAll("'", '"');
    // }
    rawText = rawText.substring(rawText.indexOf("{"), rawText.indexOf("}") + 1);
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
    const missing = missingAspects(studentProfile);
    if (missing == null) {
        return {
            "evaluation": evaluation,
            "question": "I have no more questions for you, let's start with the career guidance."
        };
    }
    instructions.push({
        role: "user",
        content: [{
            "text": "Perfect, now for getting more info, I need you to take a question for " +
                "one of the aspects that are lacking in the evaluation. I just need the question, don't add details." +
                "\nIn this case, the aspect that is lacking is: " + missing + " - Note: Name will be always a priority question" +
                "\nHere you have a reference, take one of the possible questions: " + JSON.stringify(reference[missing as keyof typeof reference])
                + "\nIt is needed that you translate the question to the language of the student: " + studentProfile.Language
            // +"\nAnd don't repeat this questions: " + questionsMade.join("\n -")
        }]
    });
    const suggestionsResponse = await client.send(command);
    const question = suggestionsResponse.output?.message?.content?.[0].text ?? '';
    console.log("Missing aspect: ", missing, " - question: ", question);
    console.log("Questions reference: ", reference[missing as keyof typeof reference]);
    const evaluationResult = {
        "evaluation": evaluation,
        "question": question
    };
    return evaluationResult;
}

// async function createProfileAspects(studentProfile: any) {
//     let AspectsScores: any = {};
//     for (const area in reference) {
//         AspectsScores[area] = Object.keys(reference[area as keyof typeof reference]);
//     }
//     const instructions: any[] = [{
//         role: "user",
//         content: [{
//             "text": "You are a psychologist that can help with vocational guidance. You are given with a student profile, " +
//                 "and you need to provide a effective evaluation of different aspects that I will give you. " +
//                 "\nHere you have the profile: " + JSON.stringify(studentProfile) +
//                 "\nAnd the aspects that you need to evaluate: " + JSON.stringify(AspectsScores) +
//                 "\n\nFor your evaluation, take each aspect and score it from 0 to 10, based on the profile of the student. " +
//                 "\nGive me just a json object with the evaluation of the aspects. You are forbidden to add any details or comments, I need just the values in the json object"
//         }]
//     }]
//     const command = new ConverseCommand({
//         modelId,
//         messages: instructions,
//         inferenceConfig: { maxTokens: 1024, temperature: 0.5, topP: 0.9 },
//     });
//     const response = await client.send(command);
//     let rawText = response.output?.message?.content?.[0].text ?? '';
//     rawText = rawText.substring(rawText.indexOf("{"), rawText.indexOf("}") + 1);

//     const aspectsEvaluation = JSON.parse(rawText);

//     return aspectsEvaluation;
// }


// Define the conversation handler for Bedrock's "converse" functionality
async function handleConversation(messages: any, question: string, studentProfile: any) {

    // Add initial context message to guide the LLM's behavior
    const systemContext = {
        role: "user",
        content: [{
            'text': "You are an AI assistant specialized in vocational guidance for students. Your goal is to help students explore their interests, skills, and career aspirations through conversation." +
                "\n here you have the current profile of the student: " + JSON.stringify(studentProfile)
        }]
    };

    const conversation = messages.map((message: any) => ({
        role: message.role,
        content: [{ 'text': message.content }]
    }));

    const userAnswer = conversation.slice(-1)[0].content[0].text;
    conversation[conversation.length - 1].content = [{
        'text': "User answer: " + userAnswer +
            "\n\nPlease answer to the user by adding this question: [" + question + "]\n" +
            "If the question is personal (gender, economic situation), be careful with the tone and try to avoid being too intrusive." +
            "Remember you are talking with the student, be as short and concise as possible. Respond with normal text in markdown format. but omit any json or system details. Be brief."
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

async function suggestCareers(messages: any[], studentProfile: any) {
    const conversation = messages.map((message: any) => ({
        role: message.role,
        content: [{ 'text': message.content }]
    }));
    const instructions: any[] = [
        {
            role: "assistant",
            content: [{
                'text': "Ok, based in all the information you have, here you have a summary of the evaluation of the student profile: " +
                    JSON.stringify(studentProfile) +
                    "Does this summary fit to your profile?"
            }]
        }, {
            role: "user",
            content: [{
                'text':
                    "Yes, it's perfects! Now based in that summary, provide a brief summary of the evaluation and suggest 3-5 potential career paths that would be a good match." +
                    "\nFocus on careers that align with my strongest aspects." +
                    "\nKeep the response concise but informative, using bullet points for the career suggestions." +
                    "\nFormat the response in markdown. Give your answer in " + studentProfile.Language
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


async function chat(messages: any[], studentProfile: any) {
    const conversation = [{
        role: "user",
        content: [{
            'text': "You are an AI assistant specialized in vocational guidance for students. Your goal is to help students explore their interests, skills, and career aspirations through conversation." +
                "\n here you have the current profile of the student: " + JSON.stringify(studentProfile) +
                "\n\n from now on, you will be looking at the conversation history and you will answer to the student based on the information provided by the student and the profile."
        }]
    }, ...messages.map((message: any) => ({
        role: message.role,
        content: [{ 'text': message.content }]
    }))];
    conversation[conversation.length - 1].content[0].text += "\n\n Give your answer in " + studentProfile.Language + " and be concise, format your answer with html tags.";
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
        const { messages, studentProfile, recommendationGiven } = await req.json();
        let giveRecommendation = false;
        const lastTwoMessages = messages.slice(-2);
        
        const userQA = `Question: ${lastTwoMessages[0].content}\n >> User Answer: ${lastTwoMessages[1].content}`;
        const missing = missingAspects(studentProfile);
        console.log("Missing aspect: ", missing);
        if (missing == null) {
            if (!recommendationGiven) {
                // evaluation of career traits
                // const aspectsEvaluation = await createProfileAspects(studentProfile);
                // console.log("Aspects evaluation: ", aspectsEvaluation);

                message.content = await suggestCareers(messages.slice(-7), studentProfile);
                // message.content = await suggestCareers(messages.slice(-7), aspectsEvaluation, studentProfile);
                giveRecommendation = true;
            } else {
                message.content = await chat(messages.slice(-10), studentProfile);
            }
        } else {
            // ask for basic information
            const evaluation = await basicProfileEvaluation(userQA, missing, studentProfile);
            if (!evaluation) {
                message.content = "Sorry, I didn't understand your response, can you give me more details.";
                return new Response(JSON.stringify({ "message": message, "profile": studentProfile, "is_question": false, "evaluation": giveRecommendation }), { status: 200 });
            }
            message.content = await handleConversation(messages.slice(-4), evaluation['question'], studentProfile);
        }


        return new Response(JSON.stringify({ "message": message, "profile": studentProfile, "evaluation": giveRecommendation }));
    } catch (error) {
        message.content = 'An error occurred while processing your request. Please try again later.';
        console.error("Error during chat invocation:", error);
        return new Response(JSON.stringify({ "message": message, "profile": null }), { status: 500 });
    }
}