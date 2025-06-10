// Bike Counter – A website for counting passing bikes
// Copyright (C) 2025  Neil Roberts
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

const DEFAULT_PROPERTIES = [
  [
    { "name": "Montée", "emoji": "↗️" },
    { "name": "Descente", "emoji": "↘️" }
  ],
  [
    { "name": "Vélo", "emoji": "🚲" },
    { "name": "Cargo&Co", "emoji": "📦" },
    { "name": "EDPM", "emoji": "🛴" }
  ],
  [
    { "name": "Homme", "emoji": "♂️" },
    { "name": "Femme", "emoji": "♀️" },
    { "name": "Enfant", "emoji": "👶" }
  ],
];

let properties = DEFAULT_PROPERTIES;

const PAGES = [
  "counter",
  "confirm",
  "edit",
];

let countElements = [];
let buttons = [];
let chosenProperties = 0;
let chosenValues = 0;
let repeatCount = 0;
const countButton = document.getElementById("count-button");
let currentlyEditedEmoji = null;

const LOCAL_STORAGE_COUNTS_PROPERTY = "bikecounter-counts";
const LOCAL_STORAGE_PROPERTIES_PROPERTY = "bikecounter-properties";
const LOCAL_STORAGE_SHOW_NAMES_PROPERTY = "bikecounter-show-names";

function createHeaderRow() {
  const header = document.createElement("tr");

  header.appendChild(document.createElement("th"));

  // Set the first half of the properties as the header row
  const nProperties = Math.ceil(properties.length / 2);
  const headerProperties = properties.slice(0, nProperties);
  const nValues = headerProperties.reduce((a, b) => a * b.length, 1);

  for (let i = 0; i < nValues; i++) {
    const title = document.createElement("th");
    let valueNum = i;

    for (const [propertyNum, property] of headerProperties.entries()) {
      if (propertyNum > 0) {
         // Add zero-width space
        title.appendChild(document.createTextNode("\u200b"));
      }

      const value = property[valueNum % property.length];
      title.appendChild(document.createTextNode(value.emoji));
      valueNum = Math.floor(valueNum / property.length);
    }

    header.appendChild(title);
  }

  return header;
}

function rowName(rowNumber) {
  const nHeaderProperties = Math.ceil(properties.length / 2);
  const headerProperties = properties.slice(nHeaderProperties);

  let name = "";

  for (const [i, property] of headerProperties.entries()) {
    if (i > 0)
      name += "\u200b"; // zero-width space
    name += property[rowNumber % property.length].emoji;
    rowNumber = Math.floor(rowNumber / property.length);
  }

  return name;
}

function createValueRow(rowNumber) {
  const row = document.createElement("tr");
  const countElements = [];

  const label = document.createElement("td");
  label.className = "row-label";
  label.appendChild(document.createTextNode(rowName(rowNumber)));
  row.appendChild(label);

  const nHeaderProperties = Math.ceil(properties.length / 2);
  const headerProperties = properties.slice(0, nHeaderProperties);
  const nHeaderValues = headerProperties.reduce((a, b) => a * b.length, 1);

  for (let i = 0; i < nHeaderValues; i++) {
    const countElement = document.createElement("td");
    countElement.appendChild(document.createTextNode("0"));
    row.appendChild(countElement);
    countElements.push(countElement);
  }

  return [row, countElements];
}

function setUpCounts() {
  const counts = document.getElementById("counts");

  counts.innerHTML = "";
  countElements = [];

  counts.appendChild(createHeaderRow());

  const nHeaderProperties = Math.ceil(properties.length / 2);
  const rowProperties = properties.slice(nHeaderProperties);
  const nRows = rowProperties.reduce((a, b) => a * b.length, 1);

  for (let i = 0; i < nRows; i++) {
    const [row, rowCountElements] = createValueRow(i);

    for (const countElement of rowCountElements)
      countElements.push(countElement);

    counts.appendChild(row);
  }
}

function allChoicesAreMade() {
  return chosenProperties >= (1 << properties.length) - 1;
}

function extractPropertyAndValue(buttonNum) {
  let firstButton = 0;

  for (const [propertyNum, property] of properties.entries()) {
    if (buttonNum - firstButton < property.length)
      return [propertyNum, firstButton, buttonNum - firstButton];

    firstButton += property.length;
  }
}

function findParentWithClass(node, className) {
  while (node) {
    if (node instanceof Element && node.classList.contains(className))
      return node;

    node = node.parentNode;
  }

  return null;
}

function disableCountButton() {
  repeatCount = 0;
  countButton.classList.remove("ready");
  countButton.innerHTML = "Compter";
}

function clickedButtonCb(event) {
  const buttonDiv = findParentWithClass(event.target, "button");

  if (!buttonDiv)
    return;

  const buttonNum = buttons.findIndex((button) => button == buttonDiv);

  if (buttonNum == -1)
    return;

  const [property, firstButton, value] = extractPropertyAndValue(buttonNum);

  for (let i = 0; i < properties[property].length; i++) {
    const classList = buttons[firstButton + i].classList;

    if (i == value)
      classList.add("selected");
    else
      classList.remove("selected");
  }

  const earlierMask = properties.slice(0, property).reduce(
    (a, b) => a * b.length,
    1
  );
  const laterMask = earlierMask * properties[property].length;

  const earlierValues = chosenValues % earlierMask;
  const laterValues = Math.floor(chosenValues / laterMask);

  chosenValues =
    earlierValues +
    value * earlierMask +
    laterValues * laterMask;

  chosenProperties |= 1 << property;
  repeatCount = 0;

  if (allChoicesAreMade())
    countButton.classList.add("ready");
  else
    disableCountButton();
}

function updateCountsTable(counts) {
  const countValues = [];

  for (let i = 0; i < countElements.length; i++)
    countValues.push(0);

  for (const [time, bikeNum] of counts) {
    if (bikeNum >= 0 && bikeNum < countValues.length)
      countValues[bikeNum]++;
  }

  for (const [i, countElement] of countElements.entries())
    countElement.innerHTML = countValues[i];
}

function saveCounts(counts) {
  localStorage.setItem(LOCAL_STORAGE_COUNTS_PROPERTY, JSON.stringify(counts));
}

function loadCounts() {
  const countsSource = localStorage.getItem(LOCAL_STORAGE_COUNTS_PROPERTY);

  if (countsSource === null)
    return [];

  let counts;

  try {
    counts = JSON.parse(countsSource);
  } catch (e) {
    if (e instanceof SyntaxError)
      return [];
    else
      throw e;
  }

  if (!(counts instanceof Array))
    return [];

  return counts;
}

function countBike(bikeNum) {
  const counts = loadCounts();

  counts.push([Math.floor(Date.now() / 1000), bikeNum]);

  saveCounts(counts);

  updateCountsTable(counts);
}

function setCountButtonRepeat() {
  let text = "";
  let values = chosenValues;

  for (const property of properties) {
    text += property[values % property.length].emoji;
    values = Math.floor(values / property.length);
  }

  text += " " + repeatCount;

  countButton.innerHTML = "";
  countButton.appendChild(document.createTextNode(text));
}

function countButtonCb() {
  if (repeatCount == 0 && !allChoicesAreMade())
    return;

  for (const button of buttons)
    button.classList.remove("selected");

  countBike(chosenValues);

  chosenProperties = 0;
  repeatCount++;
  setCountButtonRepeat();
}

function undoCb() {
  disableCountButton();

  const counts = loadCounts();

  if (counts.pop() !== undefined) {
    saveCounts(counts);
    updateCountsTable(counts);
  }
}

function hideEditError() {
  document.getElementById("edit-error-message").style.display = "none";
}

function removeValueCb(event) {
  const valueDiv = findParentWithClass(event.target, "value");

  if (!valueDiv)
    return;

  const propertyDiv = valueDiv.parentNode;

  propertyDiv.removeChild(valueDiv);

  const firstValue = propertyDiv.querySelector(".value");

  if (!firstValue)
    propertyDiv.parentNode.removeChild(propertyDiv);

  hideEditError();
}


function findParentValueOrProperty(node) {
  while (node) {
    if (node instanceof Element &&
        ["property", "value"].includes(node.className)) {
      return node;
    }

    node = node.parentNode;
  }

  return null;
}

function moveUpCb(event) {
  const div = findParentValueOrProperty(event.target);

  if (!div)
    return;

  const previous = div.previousElementSibling;

  if (previous && previous.className == div.className)
    div.parentNode.insertBefore(div, previous);
}

function moveDownCb(event) {
  const div = findParentValueOrProperty(event.target);

  if (!div)
    return;

  const next = div.nextElementSibling;

  if (next && next.className == div.className) {
    const parent = div.parentNode;

    if (next.nextSibling)
      parent.insertBefore(div, next.nextSibling);
    else
      parent.appendChild(div);
  }
}

function showEmojiSelectorCb(event) {
  const selectorStyle = document.getElementById("emoji-selector").style;

  selectorStyle.left = "min(calc(100vw - 10em), " + event.clientX + "px";
  selectorStyle.top = "min(calc(100vh - 7em), " + event.clientY + "px";
  selectorStyle.display = "block";

  currentlyEditedEmoji = event.target.parentNode.querySelector(".value-emoji");
}

function addMoveButtons(parent) {
  const moveUpButton = document.createElement("div");
  moveUpButton.appendChild(document.createTextNode("⬆️"));
  moveUpButton.className = "move-up-button";
  moveUpButton.addEventListener("click", moveUpCb);
  parent.appendChild(moveUpButton);

  const moveDownButton = document.createElement("div");
  moveDownButton.appendChild(document.createTextNode("⬇️"));
  moveDownButton.className = "move-down-button";
  moveDownButton.addEventListener("click", moveDownCb);
  parent.appendChild(moveDownButton);
}

function createValueDiv(name, emoji) {
  const valueDiv = document.createElement("div");
  valueDiv.className = "value";

  const nameElem = document.createElement("input");
  nameElem.setAttribute("type", "text");
  nameElem.className = "value-name";
  nameElem.value = name;
  valueDiv.appendChild(nameElem);

  const emojiElem = document.createElement("input");
  emojiElem.setAttribute("type", "text");
  emojiElem.className = "value-emoji";
  emojiElem.value = emoji;
  valueDiv.appendChild(emojiElem);

  const emojiSelector = document.createElement("div");
  emojiSelector.className = "emoji-selector-button";
  emojiSelector.appendChild(document.createTextNode("🙂︎"));
  emojiSelector.addEventListener("click", showEmojiSelectorCb);
  valueDiv.appendChild(emojiSelector);

  addMoveButtons(valueDiv);

  const removeButton = document.createElement("div");
  removeButton.className = "remove-value-button";
  removeButton.appendChild(document.createTextNode("🗑️"));
  removeButton.addEventListener("click", removeValueCb);
  valueDiv.appendChild(removeButton);

  return valueDiv;
}

function addValueCb(event) {
  const valueDiv = createValueDiv("A", "🅰️");

  event.target.parentNode.insertBefore(valueDiv, event.target);

  hideEditError();
}

function createPropertyDiv(property) {
  const propertyDiv = document.createElement("div");
  propertyDiv.className = "property";

  addMoveButtons(propertyDiv);

  for (const value of property) {
    const valueDiv = createValueDiv(value.name, value.emoji);
    propertyDiv.appendChild(valueDiv);
  }

  const addValueButton = document.createElement("div");
  addValueButton.addEventListener("click", addValueCb);
  addValueButton.appendChild(document.createTextNode("Ajouter une valeur"));
  addValueButton.className = "add-value-button";
  propertyDiv.appendChild(addValueButton);

  propertyDiv.appendChild(document.createElement("hr"));

  return propertyDiv;
}

function updatePropertyInputs() {
  const propertiesElem = document.getElementById("edit-properties");

  propertiesElem.innerHTML = "";

  for (const property of properties) {
    const propertyDiv = createPropertyDiv(property);
    propertiesElem.appendChild(propertyDiv);
  }
}

function addPropertyCb() {
  const propertyDiv = createPropertyDiv(
    [
      { "name": "A", "emoji": "🅰️" },
      { "name": "B", "emoji": "🅱️" },
    ]
  );

  document.getElementById("edit-properties").appendChild(propertyDiv);

  hideEditError();
}

function extractProperties() {
  const properties = [];

  const editPropertiesElem = document.getElementById("edit-properties");

  for (const propertyDiv of editPropertiesElem.children) {
    if (propertyDiv.className != "property")
      continue;

    const property = [];

    for (const valueDiv of propertyDiv.children) {
      if (valueDiv.className != "value")
        continue;

      const value = {
        "name": valueDiv.querySelector(".value-name").value,
        "emoji": valueDiv.querySelector(".value-emoji").value,
      };

      property.push(value);
    }

    properties.push(property);
  }

  return properties;
}

function validateProperties(properties) {
  if (properties.length == 0)
    return "Il faut au moins un attribut !";

  for (const property of properties) {
    for (const value of property) {
      if (!(/\S/.test(value.name)))
        return "Une des valeurs n’a pas de nom.";
      if (!(/\S/.test(value.emoji)))
        return "Une des valeurs n’a pas d’émoji.";
    }
  }

  return null;
}

function commitEditCb() {
  const newProperties = extractProperties();
  const errorMessage = validateProperties(newProperties);

  if (errorMessage) {
    const errorMessageDiv = document.getElementById("edit-error-message");
    errorMessageDiv.innerHTML = "";
    errorMessageDiv.appendChild(document.createTextNode(errorMessage));
    errorMessageDiv.style.display = "block";
  } else {
    setPage("counter");
    properties = newProperties;
    chosenProperties = 0;
    chosenValues = 0;
    localStorage.removeItem(LOCAL_STORAGE_COUNTS_PROPERTY);
    localStorage.setItem(LOCAL_STORAGE_PROPERTIES_PROPERTY,
                         JSON.stringify(properties));
    setUpButtons();
    setUpCounts();
    disableCountButton();
  }
}

function editInputCb(event) {
  if (["value-name", "value-emoji"].includes(event.target.className))
    hideEditError();
}

function editCb() {
  setPage("confirm");

  updatePropertyInputs();
}

function noEditCb() {
  setPage("counter");
}

function yesEditCb() {
  setPage("edit");
}

function downloadTsv(tsv) {
  const elem = document.createElement("a");
  elem.href = "data:text/tab-separated-values;charset=utf-8," +
    encodeURIComponent(tsv);
  elem.setAttribute("download", "comptage.tsv");
  elem.style.display = "none";
  document.body.appendChild(elem);
  elem.click();
  document.body.removeChild(elem);
}

function generateRawDataTsv(counts) {
  let tsv = "";

  for (const values of properties) {
    for (const value of values)
      tsv += "\t" + value.name.replace(/\s+/, " ");
  }

  tsv += "\n";

  for (const [timeStamp, bikeNum] of counts) {
    const date = new Date();
    date.setTime(timeStamp * 1000);
    tsv += date.toISOString();

    let bikeNumBits = bikeNum;

    for (const property of properties) {
      for (let value = 0; value < property.length; value++) {
        if (bikeNumBits % property.length == value)
          tsv += "\t1";
        else
          tsv += "\t";
      }

      bikeNumBits = Math.floor(bikeNumBits / property.length);
    }

    tsv += "\n";
  }

  return tsv;
}

function formatTimeQuarter(quarter) {
  return new String(Math.floor(quarter / 4)).padStart(2, "0") +
    ":" +
    new String((quarter % 4 * 15)).padStart(2, "0");
}

function generateSummaryForQuarter(quarter, counts) {
  const bikeNumCounts = {};

  for (const [timeStamp, bikeNum] of counts)
    bikeNumCounts[bikeNum] = (bikeNumCounts[bikeNum] || 0) + 1;

  const nValues = properties.reduce((a, b) => a * b.length, 1);

  let tsv = "";

  for (let bikeNum = 0; bikeNum < nValues; bikeNum++) {
    tsv += formatTimeQuarter(quarter) + "\t" + formatTimeQuarter(quarter + 1);

    let bikeNumValue = bikeNum;

    for (const property of properties) {
      tsv += "\t" + property[bikeNumValue % property.length].name;
      bikeNumValue = Math.floor(bikeNumValue / property.length);
    }

    tsv += "\t" + (bikeNumCounts[bikeNum] || 0) + "\n";
  }

  return tsv;
}

function generateSummaryTsv(counts) {
  let lastQuarter = null;
  let quarterStart = null;
  const countDate = new Date();
  let tsv = "";

  for (const [countNum, [timeStamp, bikeNum]] of counts.entries()) {
    countDate.setTime(timeStamp * 1000);

    const minutesInDay = countDate.getHours() * 60 + countDate.getMinutes();
    const quarter = Math.floor(minutesInDay / 15);

    if (lastQuarter != quarter) {
      if (quarterStart !== null) {
        const quarterCounts = counts.slice(quarterStart, countNum);
        tsv += generateSummaryForQuarter(lastQuarter, quarterCounts);
      }
      quarterStart = countNum;
      lastQuarter = quarter;
    }
  }

  if (quarterStart !== null)
    tsv += generateSummaryForQuarter(lastQuarter, counts.slice(quarterStart));

  return tsv;
}

function downloadCb() {
  const counts = loadCounts();

  const tsv =
        "Données crues :\n" +
        "\n" +
        generateRawDataTsv(counts) +
        "\n" +
        "Résumé par quart d’heure :\n" +
        "\n" +
        generateSummaryTsv(counts);

  downloadTsv(tsv);
}

function hideEmojiSelector() {
  document.getElementById("emoji-selector").style.display = "none";
}

function keydownCb() {
  hideEmojiSelector();
}

function clickCb(event) {
  if (event.target.className == "emoji-selector-button")
    return;

  const emojiSelector = document.getElementById("emoji-selector");

  if (!emojiSelector.contains(event.target)) {
    hideEmojiSelector();
    return;
  }

  if (event.target.className != "emoji" || !currentlyEditedEmoji)
    return;

  currentlyEditedEmoji.value = event.target.textContent;
  hideEmojiSelector();
}

function setUpButtons() {
  const buttonContainer = document.getElementById("buttons");

  buttonContainer.innerHTML = "";

  buttons = [];

  for (const property of properties) {
    const row = document.createElement("div");

    row.className = "button-row";

    for (const [valueNum, value] of property.entries()) {
      const button = document.createElement("div");
      button.className = "button choice-" + valueNum;

      const buttonName = document.createElement("span");
      buttonName.appendChild(document.createTextNode(value.name + " "));
      buttonName.className = "button-name";
      button.appendChild(buttonName);

      const buttonEmoji = document.createElement("span");
      buttonEmoji.appendChild(document.createTextNode(value.emoji));
      buttonEmoji.className = "button-emoji";
      button.appendChild(buttonEmoji);

      row.appendChild(button);

      buttons.push(button);
    }

    buttonContainer.appendChild(row);
  }

  buttonContainer.addEventListener("click", clickedButtonCb);
}

function setShowNames(value) {
  const classList = document.body.classList;

  if (value)
    classList.add("show-names");
  else
    classList.remove("show-names");
}

function loadShowNames() {
  const loadedValue = localStorage.getItem(LOCAL_STORAGE_SHOW_NAMES_PROPERTY);
  const value = loadedValue === null || !!loadedValue;

  document.getElementById("show-name-checkbox").checked = value;
  setShowNames(value);
}

function showNamesCb(event) {
  const value = event.target.checked;

  setShowNames(value);
  localStorage.setItem(LOCAL_STORAGE_SHOW_NAMES_PROPERTY, value ? "yes" : "");
}

function setPage(chosenPage) {
  for (const page of PAGES) {
    const elem = document.getElementById(page + "-page");
    elem.style.display = page == chosenPage ? "block" : "none";
  }
}

function loadProperties() {
  const propertiesSource =
        localStorage.getItem(LOCAL_STORAGE_PROPERTIES_PROPERTY);

  if (propertiesSource === null)
    return DEFAULT_PROPERTIES;

  let newProperties;

  try {
    newProperties = JSON.parse(propertiesSource);
  } catch (e) {
    if (e instanceof SyntaxError)
      return DEFAULT_PROPERTIES;
    else
      throw e;
  }

  if (!(newProperties instanceof Array))
    return DEFAULT_PROPERTIES;

  const properties = [];

  for (const property of newProperties) {
    const values = [];

    for (const value of property) {
      if (Object.hasOwn(value, "name") &&
          Object.hasOwn(value, "emoji")) {
        values.push({
          "name": value.name.toString(),
          "emoji": value.emoji.toString(),
        });
      }
    }

    if (values.length > 0)
      properties.push(values);
  }

  if (properties.length == 0)
    return DEFAULT_PROPERTIES;

  return properties;
}

function setup() {
  properties = loadProperties();

  setUpCounts();
  setUpButtons();
  loadShowNames();
  updateCountsTable(loadCounts());
  disableCountButton();

  countButton.addEventListener("click", countButtonCb);

  document.getElementById("undo-button")
    .addEventListener("click", undoCb);
  document.getElementById("edit-button")
    .addEventListener("click", editCb);
  document.getElementById("no-edit-button")
    .addEventListener("click", noEditCb);
  document.getElementById("yes-edit-button")
    .addEventListener("click", yesEditCb);
  document.getElementById("download-button")
    .addEventListener("click", downloadCb);
  document.getElementById("add-property-button")
    .addEventListener("click", addPropertyCb);
  document.getElementById("commit-edit-button")
    .addEventListener("click", commitEditCb);
  document.getElementById("edit-properties")
    .addEventListener("input", editInputCb);
  document.addEventListener("keydown", keydownCb);
  document.addEventListener("click", clickCb);
  document.getElementById("show-name-checkbox")
    .addEventListener("input", showNamesCb);
}

setup();
