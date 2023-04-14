// ==UserScript==
// @name         Grundos Cafe Quest Cost Calculator
// @namespace    https://www.grundos.cafe
// @namespace    https://grundos.cafe
// @version      0.3
// @description  Calculates the cost of the Grundos Cafe Quest items as the user searches for them on the Shop Wiz. Displays the info in a table above the Shop Wiz Search. Does not include Main Shops. Only Shop Wiz.
// @author       Dark_Kyuubi
// @match        https://www.grundos.cafe/market/wizard*
// @match        https://grundos.cafe/market/wizard*
// @match        https://www.grundos.cafe/winter/snowfaerie*
// @match        https://grundos.cafe/winter/snowfaerie*
// @match        https://www.grundos.cafe/halloween/witchtower*
// @match        https://grundos.cafe/halloween/witchtower*
// @match        https://www.grundos.cafe/halloween/esophagor*
// @match        https://grundos.cafe/halloween/esophagor*
// @match        https://www.grundos.cafe/island/kitchen*
// @match        https://grundos.cafe/island/kitchen*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=grundos.cafe
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @license      MIT
// ==/UserScript==

class QuestItems {
    constructor(questGiver, items, deadline) {
        this.questGiver = questGiver;
        this.items = items;
        this.deadline = deadline;
    }
}

class Item {
    constructor(name, cost) {
        this.name = name;
        this.cost = cost;
    }
}

//Map serialization and proper Map checking is pain
let quests = [];
let questsGrid = document.createElement('div');

const styles = `
    .quest-item,.quest-giver,.final-cost { 
        width: 100%;
        height: 100%;
        border: 1px solid black;
`
let styleSheet = document.createElement("style");

(function () {
    'use strict';
    
    initializeQuests();

    if (!window.location.href.includes("wizard")) {
        let questGiver = determineQuestGiver();
        if (window.location.href.includes("complete")) {
            if (!document.querySelector("strong.red")) {
                quests = quests.filter(q => q.questGiver !== questGiver);
                quests.length == 0 ? GM_deleteValue('quests') : updateStoredQuests();
            }
        } else {
            getNewQuestItems(questGiver);
        }
    } else {
        let shopWizResult = document.querySelector('.sw_results');
        let swItem = document.querySelector('.nomargin>strong')?.innerHTML.substring(18, undefined).trim();
        if (quests.length > 0 && shopWizResult && isQuestItem(swItem)) {
            pushStyle();
            showCalculatedQuestsSumOnWiz(shopWizResult, swItem);
        }
    }

    function isQuestItem(swItem) {
        return quests.some(q => q.items.some(i => i.name === swItem));
    }

    function showCalculatedQuestsSumOnWiz(shopWizResult, swItem) {
        collectShopWizPrice(swItem);
        questsGrid.setAttribute('style', getGridStyle());
        createQuestGiverHeaders();
        createQuestItemRows();
        createQuestSumRow();
        //to find it easier in the DOM for debugging purposes
        questsGrid.className = 'quest-grid';
        //try not to insert on main Shop Wiz page, only on result page
        document.getElementsByTagName('main')[0]?.insertBefore(questsGrid, shopWizResult);
    }

    function getGridStyle() {
        let gridStyle = 'display: grid; border: 1px solid black;text-align: center;';
        //columns
        gridStyle += 'grid-template-columns: repeat(' + quests.length + ', 1fr);';
        return gridStyle;
    }

    function createQuestItemRows() {
        for (let i = 0; i < 4; i++) {
            for (const quest of quests) {
                let itemName = quest.items[i]?.name;
                if (!itemName) {
                    itemName = "-";
                }
                questsGrid.innerHTML += '<div class="quest-item">' + itemName + '</div>';
            };
        }
    }

    function collectShopWizPrice(swItem) {
        let swPrice = parseInt(document.querySelector('.sw_results>.data>strong')?.innerHTML.match(/\d+/g).join(''));
        if (swItem && swPrice) {
            updatePriceForQuestItems(swItem, swPrice);
            updateStoredQuests();
        }
    }

    function getNewQuestItems(questGiver) {
        //when you accept a quest, they are listed in .shop-item, when you return to a quest, they are listed as .quest-item... that's annoying.
        let questItemsElements = document.querySelectorAll('.shop-item').length > 0 ? document.querySelectorAll('.shop-item') : document.querySelectorAll('.quest-item');
        if (questItemsElements.length > 0) {
            let questItems = getQuestItems(questItemsElements);
            let deadline = getDeadline();
            let existingQuestIndex = quests.findIndex(q => q.questGiver === questGiver);
            if (existingQuestIndex !== -1) {
                quests[existingQuestIndex] = new QuestItems(questGiver, questItems, deadline);
            } else {
                quests.push(new QuestItems(questGiver, questItems, deadline));
            }
            updateStoredQuests();
        }
    }
})();

/**
 * Provides fallback options for previous versions of the script.
 * Will delete quests that ran out.
 */
function initializeQuests() {
    const storedQuests = GM_getValue('quests') ? JSON.parse(GM_getValue('quests')) : [];
    if (storedQuests && !storedQuests instanceof Array) {
        const parsedStoredQuests = JSON.parse(storedQuests)?.reduce((m, [key, val]) => m.set(key, val), new Map());
        if (parsedStoredQuests instanceof Map) {
            //delete old incompatible storage values
            GM_deleteValue('quests');
        }
    } else if (storedQuests) {
        quests = storedQuests.filter(questIem => questIem.deadline > Date.now());
    }
}

function getDeadline() {
    var xpath = "//span[contains(text(),'minutes')]";
    const questCountDownAfterAccepting = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    var matchingElement = questCountDownAfterAccepting ? questCountDownAfterAccepting : document.querySelector('.taelia_countdown');
    if (matchingElement) {
        const matchingElementText = matchingElement.innerText;
        let hours = matchingElementText.substring(matchingElementText.indexOf('hrs') - 2, matchingElementText.indexOf('hrs') - 1);
        let minutes = matchingElementText.substring(matchingElementText.indexOf('minutes') - 3, matchingElementText.indexOf('minutes') - 1);
        let seconds = matchingElementText.substring(matchingElementText.indexOf('seconds') - 3, matchingElementText.indexOf('seconds') - 1);
        return new Date(Date.now() + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000) + (seconds * 1000)).getTime();
    }
}

function pushStyle() {
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}

function createQuestSumRow() {
    for (const quest of quests) {
        let items = quest.items;
        let sum = 0;
        for (const item of items) {
            sum += item.cost;
        }
        questsGrid.innerHTML += '<div class="final-cost">' + sum + '</div>';
    }
}

function createQuestGiverHeaders() {
    for (const quest of quests) {
        questsGrid.innerHTML += '<div class="quest-giver">' + quest.questGiver + '</div>';
    };
}

function updateStoredQuests() {
    GM_setValue('quests', JSON.stringify(quests));
}

function updatePriceForQuestItems(swItem, swPrice) {
    quests.forEach(quest => {
        quest.items.forEach(item => {
            if (item.name === swItem) {
                item.cost = swPrice;
            }
        })
    });
}

function getQuestItems(questItemsElements) {
    let questItems = [];
    for (let i = 0; i < questItemsElements?.length; i++) {
        let questItemName = questItemsElements[i].querySelector('strong').innerHTML;
        let item = new Item(questItemName, null);
        questItems[i] = item;
    }
    return questItems;
}

function determineQuestGiver() {
    if (window.location.href.includes('snowfaerie')) {
        return 'snowfaerie';
    } else if (window.location.href.includes('witchtower')) {
        return 'edna';
    } else if (window.location.href.includes('esophagor')) {
        return 'esophagor';
    } else if (window.location.href.includes('kitchen')) {
        return 'kitchen';
    }
}

