/**
Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

//Jay Lara
//November 27, 2017
//Alexa Skill representation of the self-administered version of the PRIME-MD diagnostic instrument for common mental disorders
//Project Name: Patient Health Questionnaire Tracker
//Invocation Name: Mood Tracker

'use strict';

///** SKILL LOGIC **///

const SKILL_TITLE = "Patient Health Questionnaire Tracker";

const TOP_QUESTION = "Over the last, 2 weeks, how often have you been bothered by any of the following problems?";

const LIST_OF_QUESTIONS = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself—or that you are a failure or have let yourself or your family down",
    "Trouble concentrating on things, such as reading the newspaper or watching television",
    "Moving or speaking so slowly that other people could have noticed? Or the opposite—being so fidgety or restless that you have been moving around a lot more than usual",
    "Thoughts that you would be better off dead or of hurting yourself in some way"
];

const LIST_OF_ANSWERS = [
    "Not at all",
    "Several days",
    "More than half the days",
    "Nearly every day"
];

const LIST_OF_INTERPRETATIONS = [
    {   min: 0, max:4,
        text: "Suggests the patient may not need depression treatment"
    },
    {   min: 5, max:14,
        text: "Mild-major depressive disorder. Provider uses clinical judgement about treatment based on patient's duration of symptoms and functional impairment."
    },
    {   min: 15, max:19,
        text: "Moderate-major depressive disorder. Warrants treatment for depression using antidepressant, psychotherapy, or a combination of treatment."
    },
    {   min: 20, max:27,
        text: "Severe-major depressive disorders. Warrants treatment with antidepressant or a combination of antidepressants and psychotherapy. Provider may wish to contact a mental health provider for consultation or referral."
    }
];

const SSML_PAUSE_1 = "<break time='1s'/>";
const SSML_PAUSE_2 = "<break time='2s'/>";
const SSML_PAUSE_3 = "<break time='3s'/>";
const READY_STATEMENT = "Let's begin the questionnaire.";
const WELCOME_STATEMENT = `Welcome to the ${SKILL_TITLE}. ${SSML_PAUSE_2}Valid responses to questions are zero, one, two, or three. `
                            +`${SSML_PAUSE_2} If you need help, say, help.`
const HELP_STATEMENT = `The ${SKILL_TITLE} is an Alexa Skill representation of the self-administered version of the PRIME-MD `
                        + `diagnostic instrument for common mental disorders. The PHQ-${LIST_OF_QUESTIONS.length} is the depression `
                        + `module, which scores each of the ${LIST_OF_QUESTIONS.length} DSM-IV criteria. ${SSML_PAUSE_2}`
                        + `Just respond with a number. ${SSML_PAUSE_2}For example, say zero, one, two, or three. `
                        + `To start a new questionnaire at any time, say, start questionnaire. `
                        + `To repeat the previous question, say repeat.`;

//I should not have edited the default help dialogue, but the questionnaire needed more customized language
const HELP_CONTINUE_STATEMENT = "Valid responses to questions are zero, one, two, or three. Would you like to continue the questionnaire?";

const INVALID_RESPONSE_STATEMENT = `Select a number between 0 and ${LIST_OF_ANSWERS.length-1}.`;

const DISCLAIMER_STATEMENT = "Since the questionnaire relies on patient self-report, all responses should be verified by the clinician and a definitive diagnosis is made on clinical grounds taking into acount how well the patient understood the questionnaire, as well as other relevant information from the patient.";

const CLOSING_STATEMENT = "<prosody rate='slow'><prosody pitch='medium' volume='medium'>good</prosody><prosody pitch='high' volume='loud'>bye</prosody>!</prosody> "
                            + "Please enjoy the rest of your day.";

//get string of possible answers to be spoken by Alexa.
function getAnswersSpeechText() {
    var text = "";
    LIST_OF_ANSWERS.forEach((a,i) => { text += ssmlParagraph(`${ssmlStrongEmphasis(i)}. ${a}.`); });
    return text;
} //end of getAnswersSpeechText()

//return text surrounded with SSML Whisper Effect. make Alexa whisper text
function ssmlWhisper(text) {
    return ` <amazon:effect name="whispered">${text}</amazon:effect> `
} // end of ssmlWhisper()

//return text surrounded with SSML Emphasis at level strong. make Alexa ephasize text
function ssmlStrongEmphasis(text) {
    return ` <emphasis level="strong">${text}</emphasis> `;
} // end of ssmlStrongEmphasis()

//return text surrounded with SSML Paragraph. Make Alexa break after a certain block of text.
function ssmlParagraph(text) {
    return ` <p>${text}</p> `;
} // end of ssmlParagraph()

//creates and returns the current state or session of the skill
function createSessionAttributesObject(speechOutput, repromptText, currentQuestionIndex, questions, score) {
    return {
        "speechOutput": speechOutput,
        "repromptText": repromptText,
        "currentQuestionIndex": currentQuestionIndex,
        "questions": questions,
        "score": score
    };
} // end of createSessionAttributesObject()

//greets and welcomes user and asks initial question
function getWelcomeResponse(callback) {
    var speechOutput = ssmlParagraph(WELCOME_STATEMENT)+ssmlParagraph(READY_STATEMENT);

    //compose first question and a list of answers.
    var repromptText = `${ssmlParagraph(TOP_QUESTION)} Question 1. ${LIST_OF_QUESTIONS[0]}. ${getAnswersSpeechText()}`;

    speechOutput += repromptText;

    callback(createSessionAttributesObject(repromptText, repromptText, 0, LIST_OF_QUESTIONS, 0),
    //callback(createSessionAttributesObject(speechOutput, READY_STATEMENT, 0, LIST_OF_QUESTIONS, 0),
             buildSpeechletResponse(SKILL_TITLE, speechOutput, READY_STATEMENT, false));
} // end of getWelcomeResponse()

//handles the users' response to question and asks for more input
function handleAnswerRequest(intent, session, callback) {
    var speechOutput = "";
    var answerSlotValid = isAnswerSlotValid(intent);

    if (!(session.attributes && session.attributes.questions)) {
        // If the user responded with an answer but there is no game in progress, ask the user
        // if they want to start a new game. Set a flag to track that we've prompted the user.
        speechOutput = "Questionnaire not in progress. Start a new one? ";
        var sessionAttributes = {};
        sessionAttributes.userPromptedToContinue = true;
        callback(sessionAttributes, buildSpeechletResponse(SKILL_TITLE, speechOutput, speechOutput, false));
    }
    // else if(intent.slots.Answer.value === "ready") {
    //     var currentQuestionIndex = parseInt(session.attributes.currentQuestionIndex);
    //     console.log("Entering ready");
    //     var repromptText = `Question 1. ${LIST_OF_QUESTIONS[0]}. ${getAnswersSpeechText()}`;
    //
    //     //speechOutput += repromptText;
    //     //callback(createSessionAttributesObject(repromptText, repromptText, 0, LIST_OF_QUESTIONS, 0),
    //     callback(createSessionAttributesObject(repromptText, repromptText, currentQuestionIndex + 1, LIST_OF_QUESTIONS, parseInt(session.attributes.score)),
    //              buildSpeechletResponse(SKILL_TITLE, repromptText, repromptText, false));
    // }
    else if (!answerSlotValid) {
        // If the user provided answer isn't a number > 0 and < LIST_OF_ANSWERS.length,
        // return an error message to the user. Remember to guide the user into providing correct values.
        var reprompt = session.attributes.speechOutput;
        var speechOutput = `${INVALID_RESPONSE_STATEMENT} ${reprompt}`;
        callback(session.attributes, buildSpeechletResponse(SKILL_TITLE, speechOutput, reprompt, false));
    }
    else {
        var currentScore = parseInt(session.attributes.score);
        var currentQuestionIndex = parseInt(session.attributes.currentQuestionIndex);

        var speechOutputAnalysis = "";
        var answerSlot = intent.slots.Answer;
        var answerSlotValue = parseInt(answerSlot.value);

        if (answerSlotValue < LIST_OF_ANSWERS.length) {
            currentScore += answerSlotValue;
            speechOutputAnalysis = `${LIST_OF_ANSWERS[answerSlotValue]}. `; //valid;

        }
        else {
            speechOutputAnalysis = `invalid. ${INVALID_RESPONSE_STATEMENT}`;
        }

        //last question reached, end questionnaire session
        if (currentQuestionIndex === LIST_OF_QUESTIONS.length - 1) {
            speechOutput = `Your response was ${speechOutputAnalysis}. Your score is ${currentScore}! `;
                        //`Your response is ${speechOutputAnalysis}. `
                        //+ `Your score got ${currentScore} out of a possible ${LIST_OF_QUESTIONS.length * (LIST_OF_ANSWERS.length - 1)}! `;
            //Output appropriate each point range means
            LIST_OF_INTERPRETATIONS.forEach((a,i) => {
                if((currentScore >= a.min) && (currentScore <= a.max) ) {
                    speechOutput += `According to the PHQ, your results are: ${ssmlParagraph(a.text)} `
                                    + ssmlStrongEmphasis('Please Note:') + ssmlParagraph(DISCLAIMER_STATEMENT);
                    return;
                }
            });
            callback(session.attributes, buildSpeechletResponse(SKILL_TITLE, speechOutput, "", true));
        } //end of if
        else {
            currentQuestionIndex += 1;
            var repromptText = `Question ${currentQuestionIndex+1}. ${LIST_OF_QUESTIONS[currentQuestionIndex]}. ${getAnswersSpeechText()}`;
            //Your score is ${currentScore}.
            speechOutput += `Your response is ${speechOutputAnalysis} ${repromptText}`;

            callback(createSessionAttributesObject(repromptText, repromptText, currentQuestionIndex, LIST_OF_QUESTIONS, currentScore),
                     buildSpeechletResponse(SKILL_TITLE, speechOutput, repromptText, false));
        }//end of else
    }//end of else
} // end of handleAnswerRequest()

//repeat the previous speechOutput and repromptText from the session attributes if available else start a new questionnaire session
function handleRepeatRequest(intent, session, callback) {
    if (!session.attributes || !session.attributes.speechOutput)
        getWelcomeResponse(callback);
    else
        callback(session.attributes,buildSpeechletResponseWithoutCard(session.attributes.speechOutput, session.attributes.repromptText, false));
} // end of handleRepeatRequest()

// Sets up a help prompt for the user. Explains how the questionnaire is conducted. Continue the questionnaire if one in progress, or ask to start new one.
function handleGetHelpRequest(intent, session, callback) {
    // Set a flag to track that we're in the Help state.
    session.attributes.userPromptedToContinue = true;

    callback(session.attributes,buildSpeechletResponseWithoutCard(HELP_STATEMENT, HELP_CONTINUE_STATEMENT, false));
} // end of handleGetHelpRequest()

//end the session with a closing statement if the user wants to quit the questionnaire
function handleFinishSessionRequest(intent, session, callback) {
    callback(session.attributes, buildSpeechletResponseWithoutCard(CLOSING_STATEMENT, "", true));
} // end of handleFinishSessionRequest()

function isAnswerSlotValid(intent) {
    console.log(`intent.slots=${intent.slots}, `
                + `intent.slots.Answer=${intent.slots.Answer}, `
                + `intent.slots.Answer.value=${intent.slots.Answer.value}`);

    var answerSlotFilled = intent.slots && intent.slots.Answer && intent.slots.Answer.value;
    var answerSlotIsInt = answerSlotFilled && !isNaN(parseInt(intent.slots.Answer.value));
    return answerSlotIsInt && parseInt(intent.slots.Answer.value) < (LIST_OF_ANSWERS.length + 1) && parseInt(intent.slots.Answer.value) >= 0;
} // end of isAnswerSlotValid()


///////****** HELPER FUNCTIONS / RESPONSE BUILDERS ******///////

function createOutputSpeechObject(text) {
    return {
            "type": "SSML",
            "ssml": `<speak>${text}</speak>`
        }; // usually sent { type: "PlainText", text: output }
} // end of createOutputSpeechObject()

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: createOutputSpeechObject(output),
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: { outputSpeech: createOutputSpeechObject(repromptText) },
        shouldEndSession: shouldEndSession
    };
} // end of buildSpeechletResponse()

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: createOutputSpeechObject(output),
        reprompt: { outputSpeech: createOutputSpeechObject(repromptText) },
        shouldEndSession: shouldEndSession
    };
} // end of buildSpeechletResponseWithoutCard()

function buildResponse(sessionAttributes, speechletResponse) {
    return { version: "1.0", sessionAttributes: sessionAttributes, response: speechletResponse };
} // end of buildResponse()

// Route the incoming request based on type (LaunchRequest, IntentRequest, etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        //prevents someone else from configuring a skill that sends requests to this function.
        //if (event.session.application.applicationId !== SKILL_APP_ID)
        //   context.fail("Invalid Application ID");

        if (event.session.new)
            onSessionStarted({requestId: event.request.requestId}, event.session);

        //routes request type. for callback shorthand: session = sessionAttributes, response = speechletResponse
        switch(event.request.type) {
            case "LaunchRequest":
                onLaunch(event.request, event.session, (session, response) => { context.succeed(buildResponse(session, response)); });
                break;
            case "IntentRequest":
                onIntent(event.request, event.session, (session, response) => { context.succeed(buildResponse(session, response)); });
                break;
            case "SessionEndedRequest":
                onSessionEnded(event.request, event.session);
                context.succeed();
                break;
        }//end of switch
    }//end of try
    catch (e) {
        context.fail(`Exception: ${e}`);
    }//end of catch
};

//Called when the session starts. Called in exports.handler function
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);

    //TODO: add any session init logic here
} // end of onSessionStarted()

//Called when the user invokes the skill without specifying what they want. Called in exports.handler function
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    getWelcomeResponse(callback);
} // end of onLaunch()

//Called when the user specifies an intent for this skill. Called in exports.handler function
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    var intent = intentRequest.intent;
    var intentName = intentRequest.intent.name;

    // handle yes/no intent after the user has been prompted
    if (session.attributes && session.attributes.userPromptedToContinue) {
        delete session.attributes.userPromptedToContinue;

        switch (intentName) {
            case "AMAZON.NoIntent":     handleFinishSessionRequest(intent, session, callback);  break;
            case "AMAZON.YesIntent":    handleRepeatRequest(intent, session, callback);         break;
        } // end of switch(intentName)
    } // end of if

    // dispatch custom intents to handlers here
    switch (intentName) {
        case "AnswerIntent":            handleAnswerRequest(intent, session, callback);         break;
        case "AnswerOnlyIntent":        handleAnswerRequest(intent, session, callback);         break;
        case "AMAZON.YesIntent":        handleAnswerRequest(intent, session, callback);         break;
        case "AMAZON.NoIntent":         handleAnswerRequest(intent, session, callback);         break;
        case "AMAZON.StartOverIntent":  getWelcomeResponse(callback);                           break;
        case "AMAZON.RepeatIntent":     handleRepeatRequest(intent, session, callback);         break;
        case "AMAZON.HelpIntent":       handleGetHelpRequest(intent, session, callback);        break;
        case "AMAZON.StopIntent":       handleFinishSessionRequest(intent, session, callback);  break;
        case "AMAZON.CancelIntent":     handleFinishSessionRequest(intent, session, callback);  break;
        default:                        throw "Invalid intent";
    } // end of switch (intentName)
} // end of onIntent()

//Called when the user ends the session. Not called when the skill returns shouldEndSession=true. Called in exports.handler function
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);

    //TODO: ADD CLEAN UP LOGIC
}//end of onSessionEnded()
