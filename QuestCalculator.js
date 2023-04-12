// ==UserScript==
// @name         Grundos Cafe Quest Cost Calculator
// @namespace    https://www.grundos.cafe
// @namespace    https://grundos.cafe
// @version      0.1
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

class Item {
    constructor(name, cost) {
        this.name = name;
        this.cost = cost;
    }
}

//Map serialization and proper Map checking is pain
let quests = JSON.parse(GM_getValue('quests'))?.reduce((m, [key, val]) => m.set(key, val), new Map()) instanceof Map ? JSON.parse(GM_getValue('quests')).reduce((m, [key, val]) => m.set(key, val), new Map()) : new Map();
let questsGrid = document.createElement('div');

(function () {
    'use strict';
    if (!window.location.href.includes("wizard")) {
        let questGiver = determineQuestGiver();
        if (window.location.href.includes("complete")) {
            quests.delete(questGiver);
            quests.size == 0 ? GM_deleteValue('quests') : updateStoredQuests();
        } else {
            getNewQuestItems(questGiver);
        }
        document.querySelector('.searchhelp>a[href*="wizard"]').onclick = function () {
            GM_setValue('fromQuest', true);
        }
    } else {
        if (quests.size > 0 && GM_getValue('fromQuest', false)) {
            showCalculatedQuestsSumOnWiz();
        }
        //I just need someplace to reset the value once the Wiz had been visited
        GM_setValue('fromQuest', false);
    }

    function showCalculatedQuestsSumOnWiz() {
        collectShopWizPrice();
        questsGrid.setAttribute('style', getGridStyle());
        createQuestGiverHeaders();
        createQuestItemRows();
        createQuestSumRow();
        //to find it easier in the DOM for debugging purposes
        questsGrid.className = 'quest-grid';
        //try not to insert on main Shop Wiz page, only on result page
        document.getElementsByTagName('main')[0]?.insertBefore(questsGrid, document.querySelector('.sw_results'));
    }

    function getGridStyle() {
        let gridStyle = 'display: grid; border: 1px solid black;';
        //columns
        gridStyle += 'grid-template-columns: repeat(' + quests.size + ', 1fr);';
        //rows
        gridStyle += 'grid-template-rows: repeat(auto-fill, 1fr);';
        return gridStyle;
    }

    function createQuestItemRows() {
        for (let i = 0; i < 4; i++) {
            for (const key of quests.keys()) {
                let itemName = quests.get(key)[i]?.name;
                if (!itemName) {
                    itemName = "-";
                }
                questsGrid.innerHTML += '<div class="quest-item">' + itemName + '</div>';
            };
        }
    }

    function collectShopWizPrice() {
        let swItem = document.querySelector('.nomargin>strong')?.innerHTML.substring(18, undefined).trim();
        let swPrice = parseInt(document.querySelector('.sw_results>.data>strong')?.innerHTML.match(/\d+/g).join(''));
        if (swItem && swPrice) {
            updatePriceForQuestItems(swItem, swPrice);
            updateStoredQuests();
        }
    }

    function getNewQuestItems(questGiver) {
        let questItemsElements = document.querySelectorAll('.shop-item');
        if (questItemsElements) {
            let questItems = getQuestItems(questItemsElements);
            quests.set(questGiver, questItems);
            updateStoredQuests();
        }
    }
})();

function createQuestSumRow() {
    for (const key of quests.keys()) {
        let items = quests.get(key);
        let sum = 0;
        for (const item of items) {
            sum += item.cost;
        }
        questsGrid.innerHTML += '<div class="final-cost">' + sum + '</div>';
    }
}

function createQuestGiverHeaders() {
    for (const key of quests.keys()) {
        console.log("adding " + key + " to header row");
        questsGrid.innerHTML += '<div class="quest-giver">' + key + '</div>';
    };
}

function updateStoredQuests() {
    GM_setValue('quests', JSON.stringify(Array.from(quests)));
}

function updatePriceForQuestItems(swItem, swPrice) {
    for (const arrayOfValues of quests.values()) {
        for (const value of arrayOfValues) {
            if (value.name === swItem) {
                console.log("udpating: ", value.name);
                value.cost = swPrice;
            }
        }
    };
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

