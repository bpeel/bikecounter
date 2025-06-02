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

const PROPERTIES = [
  [
    { "name": "Ascente", "emoji": "↗️" },
    { "name": "Descente", "emoji": "↘️" }
  ],
  [
    { "name": "Musculaire", "emoji": "🦵" },
    { "name": "VAE", "emoji": "🔋" }
  ],
  [
    { "name": "Majeur", "emoji": "👨" },
    { "name": "Mineur", "emoji": "👶" }
  ],
];

let countElements = [];
let buttons = [];
let chosenProperties = 0;
let chosenValues = 0;
const countButton = document.getElementById("count-button");

function createHeaderRow() {
  // Set the first property as the header row
  const header = document.createElement("tr");

  header.appendChild(document.createElement("th"));

  for (const value of PROPERTIES[0]) {
    const title = document.createElement("th");
    title.appendChild(document.createTextNode(value.name));
    header.appendChild(title);
  }

  return header;
}

function rowName(rowNumber) {
  let name = "";

  for (const property of PROPERTIES.slice(1)) {
    if (name.length > 0)
      name += " + ";

    name += property[rowNumber % property.length].name;

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

  for (let i = 0; i < PROPERTIES[0].length; i++) {
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

  const nRows = PROPERTIES.slice(1).reduce((a, b) => a * b.length, 1);

  for (let i = 0; i < nRows; i++) {
    const [row, rowCountElements] = createValueRow(i);

    for (const countElement of rowCountElements)
      countElements.push(countElement);

    counts.appendChild(row);
  }
}

function allChoicesAreMade() {
  return chosenProperties >= (1 << PROPERTIES.length) - 1;
}

function extractPropertyAndValue(buttonNum) {
  let firstButton = 0;

  for (const [propertyNum, property] of PROPERTIES.entries()) {
    if (buttonNum - firstButton < property.length)
      return [propertyNum, firstButton, buttonNum - firstButton];

    firstButton += property.length;
  }
}

function clickedButtonCb(event) {
  const buttonNum = buttons.findIndex((button) => button == event.target);

  if (buttonNum == -1)
    return;

  const [property, firstButton, value] = extractPropertyAndValue(buttonNum);

  for (let i = 0; i < PROPERTIES[property].length; i++) {
    const classList = buttons[firstButton + i].classList;

    if (i == value)
      classList.add("selected");
    else
      classList.remove("selected");
  }

  const earlierMask = PROPERTIES.slice(0, property).reduce(
    (a, b) => a * b.length,
    1
  );
  const laterMask = earlierMask * PROPERTIES[property].length;

  const earlierValues = chosenValues % earlierMask;
  const laterValues = Math.floor(chosenValues / laterMask);

  chosenValues =
    earlierValues +
    value * earlierMask +
    laterValues * laterMask;

  chosenProperties |= 1 << property;

  if (allChoicesAreMade())
    countButton.classList.add("ready");
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
  localStorage.setItem("counts", JSON.stringify(counts));
}

function loadCounts() {
  const countsSource = localStorage.getItem("counts");

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

function countButtonCb() {
  if (!allChoicesAreMade())
    return;

  for (const button of buttons)
    button.classList.remove("selected");

  countBike(chosenValues);

  chosenValues = 0;
  chosenProperties = 0;
  countButton.classList.remove("ready");
}

function undoCb() {
  const counts = loadCounts();

  if (counts.pop() !== undefined) {
    saveCounts(counts);
    updateCountsTable(counts);
  }
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

function downloadCb() {
  let tsv = "";
  const counts = loadCounts();

  for (const values of PROPERTIES) {
    for (const value of values)
      tsv += "\t" + value.name.replace(/\s+/, " ");
  }

  tsv += "\n";

  for (const [timeStamp, bikeNum] of counts) {
    const date = new Date();
    date.setTime(timeStamp * 1000);
    tsv += date.toISOString();

    let bikeNumBits = bikeNum;

    for (const property of PROPERTIES) {
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

  downloadTsv(tsv);
}

function setUpButtons() {
  const buttonContainer = document.getElementById("buttons");

  buttons = [];

  for (const property of PROPERTIES) {
    for (const [valueNum, value] of property.entries()) {
      const button = document.createElement("div");
      button.className = "button choice-" + valueNum;
      const buttonText = value.name + " " + value.emoji;
      button.appendChild(document.createTextNode(buttonText));
      buttonContainer.appendChild(button);

      buttons.push(button);
    }
  }

  buttonContainer.addEventListener("click", clickedButtonCb);
}

function setup() {
  setUpCounts();
  setUpButtons();
  updateCountsTable(loadCounts());

  countButton.addEventListener("click", countButtonCb);

  document.getElementById("undo-button")
    .addEventListener("click", undoCb);
  document.getElementById("download-button")
    .addEventListener("click", downloadCb);
}

setup();
