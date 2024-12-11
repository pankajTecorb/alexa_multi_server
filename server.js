import express from 'express';
import Alexa, { SkillBuilders } from 'ask-sdk-core';
import axios from 'axios'; // To make HTTP requests
import { ExpressAdapter } from 'ask-sdk-express-adapter';
import dotenv from 'dotenv'
dotenv.config()


const app = express();
const PORT = process.env.PORT;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = process.env.GEMINI_ENDPOINT;

// Multi-language translation strings
const languageStrings = {
    'en-US': {
        translation: {
            WELCOME: "Hi, I am Tecorb Alex. You can ask me anything!",
            HELP: "You can ask for help. What would you like to do?",
            GOODBYE: "Goodbye!"
        }
    },
    'fr-FR': {
        translation: {
            WELCOME: "Bonjour, je suis Alex Alex. Vous pouvez me poser une question !",
            HELP: "Vous pouvez demander de l'aide. Que voulez-vous faire ?",
            GOODBYE: "Au revoir !"
        }
    },
    'ar-SA': {
        translation: {
            WELCOME: "مرحبًا، أنا تيكورب جارفيس. يمكنك أن تسألني أي شيء!",
            HELP: "يمكنك طلب المساعدة. ماذا تريد أن تفعل؟",
            GOODBYE: "مع السلامة!"
        }
    }
};

// Localization interceptor
const LocalizationInterceptor = {
    process(handlerInput) {
        const locale = Alexa.getLocale(handlerInput.requestEnvelope);
        const translations = languageStrings[locale] || languageStrings['en-US'];
        handlerInput.attributesManager.setRequestAttributes({
            t: (key) => translations.translation[key] || key
        });
    }
};

// Helper function to call Gemini API
async function callGeminiApi(prompt) {
    try {
        const response = await axios.post(
            GEMINI_ENDPOINT,
            { prompt },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GEMINI_API_KEY}`
                }
            }
        );
        return response.data.answer || "I'm not sure how to respond.";
    } catch (error) {
        console.error('Error calling Gemini API:', error.response?.data || error.message);
        return "Sorry, I couldn't process your request.";
    }
}

// Alexa Skill Handlers
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const { t } = handlerInput.attributesManager.getRequestAttributes();
        const speakOutput = t('WELCOME');
        return handlerInput.responseBuilder.speak(speakOutput).reprompt(speakOutput).getResponse();
    }
};

const AskQuestionIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'AskQuestionIntent';
    },

    async handle(handlerInput) {
        const userQuestion = Alexa.getSlotValue(handlerInput.requestEnvelope, 'question') || 'No question provided';
        const geminiResponse = await callGeminiApi(userQuestion);
        return handlerInput.responseBuilder.speak(geminiResponse).getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const { t } = handlerInput.attributesManager.getRequestAttributes();
        const speakOutput = t('HELP');
        return handlerInput.responseBuilder.speak(speakOutput).reprompt(speakOutput).getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const { t } = handlerInput.attributesManager.getRequestAttributes();
        const speakOutput = t('GOODBYE');
        return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    }
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';
        return handlerInput.responseBuilder.speak(speakOutput).reprompt(speakOutput).getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.error(`Error handled: ${error.message}`);
        const speakOutput = 'Sorry, I had trouble understanding your request. Please try again.';
        return handlerInput.responseBuilder.speak(speakOutput).reprompt(speakOutput).getResponse();
    }
};

// Build the Alexa Skill
const skillBuilder = SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        AskQuestionIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler
    )
    .addErrorHandlers(ErrorHandler)
    .addRequestInterceptors(LocalizationInterceptor);

const skill = skillBuilder.create();
const adapter = new ExpressAdapter(skill, false, false);

// Define Routes
app.post('/api/v1/webhook-alexa', adapter.getRequestHandlers());

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});



