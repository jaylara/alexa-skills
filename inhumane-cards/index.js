/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/**
Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

 //Jay Lara
 //November 27, 2017
 //Alexa Skill to draw dirty cards. Draws a black card, black card indicates how many white cards to pick, and picks them.
 //Project Name: Inhumane Cards
 //Invocation Name:Inhumane Cards

'use strict';

const ALEXA = require('alexa-sdk');
const HTTP = require('http');

const APP_ID = undefined;  // TODO replace with your app ID (OPTIONAL).

const LANGUAGE_STRINGS = {
    'en': {
        translation: {
            CARDS: [
            ],
            SKILL_NAME: 'Inhumane Cards',
            GET_CARD_MESSAGE: "Here's a new card set: ",
            HELP_MESSAGE: 'You can say draw new cards, or, you can say exit... What can I help you with?',
            HELP_REPROMPT: 'What can I help you with?',
            STOP_MESSAGE: 'Goodbye!',
        },
    },
    'en-US': {
        translation: {
            CARDS: [
            ],
            SKILL_NAME: 'Inhumane Cards',
        },
    },
};

const JSON_ENDPOINT = 'http://jaydata.herokuapp.com/cah'

const HANDLERS = {
    'LaunchRequest': function () {
        this.emit('GetCardCombo');
    },
    'GetNewCardCombinationIntent': function () {
        this.emit('GetCardCombo');
    },
    'GetCardCombo': function () {
        // Get a random space fact from the space facts list
        // Use this.t() to get corresponding language data
        const cardArr = this.t('CARDS');
        const cardIndex = Math.floor(Math.random() * cardArr.length);
        const randomCard = cardArr[cardIndex];

        // Create speech output
        const speechOutput = this.t('GET_CARD_MESSAGE') + randomCard;
        this.emit(':tellWithCard', speechOutput, this.t('SKILL_NAME'), randomCard);
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = this.t('HELP_MESSAGE');
        const reprompt = this.t('HELP_MESSAGE');
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
};

//returns formated card string using SSML
function ssmlWhiteCard(card) {
    return `<prosody pitch="x-high" volume="x-loud">${card}</prosody>`;
} // end of ssmlWhiteCard()

//draws 5 sets of cards and returns them: [ { blackCard: "", whiteCards: [...] }, ... ]
function drawCardSets(blackCards, whiteCards) {
    var selectedCardSets = [];
    for (var b = 0; b < 5; b++) {
        var index = Math.floor(Math.random() * blackCards.length);
        var drawnBlackCard = blackCards[index].text.replace(/<[^>]+>/g, ' ');
        var drawnWhiteCards =[];
        if(drawnBlackCard.indexOf('_') != -1) {
            for (var w = 0; w < parseInt(blackCards[index].pick); w++) {
                drawnWhiteCards.push(whiteCards[Math.floor(Math.random() * whiteCards.length)])
            }
        }
        else {
            drawnWhiteCards.push(whiteCards[Math.floor(Math.random() * whiteCards.length)])
        }
        selectedCardSets.push({blackCard: drawnBlackCard, whiteCards: drawnWhiteCards});
    } //end of for (drawing cards)
    return selectedCardSets;
} // end of drawCardSets()

//returns formatted cards so that Alexa can say them.
function createSpeechCardSets(drawnCardSets) {
    var speechCardSets = [];
    drawnCardSets.forEach((cardSet) => {
        var out = cardSet.blackCard;
        cardSet.whiteCards.forEach((card) => {
            out = out.replace('_', ssmlWhiteCard(card));
        });
        speechCardSets.push(`<p>${out}</p>`);
    });
    return speechCardSets;
} // end of createSpeechCardSets()

exports.handler = function (event, context) {
    const alexa = ALEXA.handler(event, context);
    alexa.APP_ID = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    //'http://jaydata.herokuapp.com/portfolio/blurbs'
    HTTP.get(JSON_ENDPOINT, function (res) {
        var respString = '';
        console.log('Status Code: ' + res.statusCode);

        res.on('data', function (data) {
            respString += data;
        });

        res.on('end', function () {
            var respObj = JSON.parse(respString);
            if (!respObj.error) {
                var drawnCardSets = drawCardSets(respObj.blackCards, respObj.whiteCards);

                var speechCardSets = createSpeechCardSets(drawnCardSets);

                var joinedSets = [speechCardSets.join("<break time='2s'/>")];

                LANGUAGE_STRINGS['en'].translation.CARDS = joinedSets;
                LANGUAGE_STRINGS['en-US'].translation.CARDS = joinedSets;

                alexa.resources = LANGUAGE_STRINGS;
                alexa.registerHandlers(HANDLERS);
                alexa.execute();
            } //end of if (no error)
            else {
                console.log("CAH Error: " + respObj.error.message);
            } // end of else
        });
    }).on('error', function (e) {
        console.log("Communications error: " + e.message);
    });//end of ajax request

};//end of handler
