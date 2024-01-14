import { createWorker } from 'tesseract.js';

const extractText = async (crops, images, startPage, endPage, callBackStatus = () => { }, callbackEnd = () => { }) => {
    const textBlocks = [];
    const worker = await createWorker('deu');

    for (let i = startPage - 1; i < endPage; i++) {
        if (!crops[i]) continue;

        for (let j = 0; j < crops[i].length; j++) {
            const cropOfPage = crops[i][j];
            callBackStatus(i, j);
            const croppedDataURL = await cropImageByPercentage(images[i], cropOfPage.x, cropOfPage.y, cropOfPage.width, cropOfPage.height);
            const data = await worker.recognize(croppedDataURL);

            // Hier werden einzelne Absätze nach FontSize aufgesplittet
            const newParagraphs = groupAndConcatenateByFontSize(data.data);

            textBlocks.push(newParagraphs.map((x, index) => ({
                text: convertToOneLine(x.text),
                abstract: "",
                page: [i],
                fontSize: x.lines[0].words[0].font_size,
                order: index
            })));
        }
    }

    await worker.terminate();

    const flattenedTextBlocks = flattenArray(textBlocks);
    const analyzedTextBlocks = analyzeFontSizes(flattenedTextBlocks);
    const result = mergeTextObjects(analyzedTextBlocks);

    callbackEnd(result);
    return result;
};


function groupAndConcatenateByFontSize(data) {
    const resultParagraphs = [];

    for (const p of data.paragraphs) {
        const groupedLines = [];
        let currentGroup = [];

        for (let i = 0; i < p.lines.length; i++) {
            const line = p.lines[i];
            const fontSize = line.words[0].font_size;

           

        
            if (i === 0 || Math.abs(fontSize - p.lines[i - 1].words[0].font_size) > 1) {
                  
                    if (currentGroup.length > 0) {
                        groupedLines.push(currentGroup);
                    }
                    currentGroup = [{
                        fontSize,
                        text: line.text
                    }];
                } else {
                    // Ansonsten zur aktuellen Gruppe hinzufügen
                    currentGroup.push({
                        fontSize,
                        text: line.text
                    });
                }
        }

        // Letzte Gruppe hinzufügen
        if (currentGroup.length > 0) {
            groupedLines.push(currentGroup);
        }

        const paragraphs = groupedLines.map(group => ({
            ...p,
            lines: [{
                words: [{
                    font_size: group[0].fontSize
                }]
            }],
            text: group.map(line => line.text).join('\n'),
        }));

        // Fügen Sie die Paragraphen-Objekte in der ursprünglichen Reihenfolge hinzu
        resultParagraphs.push(...paragraphs);
    }

    return resultParagraphs;
}

const convertToOneLine = (text) => {



    function customJoin(arr) {
        let result = "";

        for (let i = 0; i < arr.length; i++) {

            if (i === (arr.length - 1)) {
                result += arr[i];
                continue;
            }
            if (arr[i].endsWith("-")) {
                // If string ends with "-", remove the "-" and append to result
                result += arr[i].slice(0, -1);
            } else {
                // If string does not end with "-", append it to result with a space (unless it's the last string)
                result += arr[i] + (i === arr.length - 1 ? "" : " ");
            }
        }

        return result;
    }

    let lines = text.split("\n")

    console.log([...lines])
    for (let index = 0; index < lines.length; index++) {

        lines[index] = lines[index].replace(/\r/g, '')
        lines[index] = lines[index].replace(/\n/g, '')
        lines[index] = lines[index].trim();
    }

    lines = lines.filter(str => str !== "");

    const resultString = customJoin(lines)

    return resultString

};

function flattenArray(arr) {
    return arr.reduce((acc, val) => acc.concat(val), []);
}

function analyzeFontSizes(textObjects, minFontSizeDifference = 2) {
    let fontSizeMap = {};

    // Zähle die Zeichenanzahl für jede Schriftgröße
    for (let obj of textObjects) {
        if (!fontSizeMap[obj.fontSize]) {
            fontSizeMap[obj.fontSize] = 0;
        }
        fontSizeMap[obj.fontSize] += obj.text.length;
    }

    // Erstelle ein Array aus den Ergebnissen und sortiere es nach der Zeichenanzahl
    let fontSizeArray = Object.keys(fontSizeMap).map(fontSize => {
        return {
            fontSize: parseInt(fontSize),
            count: fontSizeMap[fontSize],
            isHeading: false
        };
    }).sort((a, b) => b.count - a.count);

    // Die Schriftgröße mit der höchsten Zeichenanzahl ist wahrscheinlich der Fließtext
    const paragraphFontSize = fontSizeArray[0].fontSize;

    // Alle Schriftgrößen, die einen ausreichend großen Unterschied zur Fließtext-Schriftgröße haben, sind Überschriften
    for (let i = 0; i < fontSizeArray.length; i++) {
        const fontSizeDifference = fontSizeArray[i].fontSize - paragraphFontSize;
        if (fontSizeDifference > minFontSizeDifference) {
            fontSizeArray[i].isHeading = true;
        }
    }

    // Füge die isHeading Eigenschaft zu jedem Textobjekt hinzu
    for (let obj of textObjects) {
        const fontSizeInfo = fontSizeArray.find(item => item.fontSize === obj.fontSize);
        obj.isHeading = fontSizeInfo ? fontSizeInfo.isHeading : false;
    }

    return textObjects;
}








function mergeUniqueArrays(arr1, arr2) {
    // Use a Set to store unique elements
    const uniqueSet = new Set();

    // Add elements from the first array to the Set
    arr1.forEach(item => uniqueSet.add(item));

    // Add elements from the second array to the Set
    arr2.forEach(item => uniqueSet.add(item));

    // Convert the Set back to an array
    const mergedArray = Array.from(uniqueSet);

    return mergedArray;
}

function addLineBreaksInInputArray(textObjects) {
    const lists = [];
    const listRanges = []

    for (let i = 0; i < textObjects.length; i++) {
        const textObj = textObjects[i];

        // Prüfen, ob der Text mit einer Nummer oder einem Aufzählungszeichen beginnt
        if (/^[0-9]+\./.test(textObjects[i].text)) {
            lists.push(true);
        } else {
            lists.push(false);
        }
    }

    let closed = false;
    for (let i = 0; i < textObjects.length; i++) {
        const textObj = textObjects[i];

        if (lists[i] && !lists[i - 1] && lists[i + 1] && i > 0 && !closed) {
            // Start of List
            textObjects[i - 1].text += '\n\n';
            listRanges.push(i)
            closed = true;
        }

        if (lists[i] && !lists[i + 1] && lists[i - 1] && closed) {
            // End of List
            textObjects[i].text += '\n\n';
            listRanges.push(i)
            closed = false
        }
    }

    const textObjectsToDelete = []

    for (let i = 0; i < listRanges.length; i += 2) {

        const von = listRanges[i]
        const bis = listRanges[i + 1]

        let mergedText = ""
        const pages = []

        for (let y = von; y < bis + 1; y++) {

            mergedText += textObjects[y].text + " "

            if (y === bis) {
                textObjects[y].text = mergedText
                textObjects[y].page = mergeUniqueArrays(pages, textObjects[y].page)
            } else {
                pages.push(textObjects[y].page)
                textObjectsToDelete.push(y)
            }
        }
    }
    textObjectsToDelete.sort((a, b) => b - a);

    for (const index of textObjectsToDelete) {
        textObjects.splice(index, 1);
    }

    // hier sollte ich die Textobjekte, die zu einer Liste gehören schon zusammenführen
    return textObjects
}

function mergeTextObjects(textObjects) {

    //Die Funktion addLineBreaksInInputArray schaut ob in einzelnen Textblöcken Listen erkennbar sind. Diese 
    textObjects = addLineBreaksInInputArray(textObjects)

    let mergedTexts = [];

    for (let i = 0; i < textObjects.length; i++) {

        let currentText = textObjects[i].text;

        const currentPage = [...textObjects[i].page]

        let nextPage = null;
        let nextText = null;
        const isLast = !(i < textObjects.length - 1);

        if (!isLast) {
            nextText = textObjects[i + 1].text;
            nextPage = [...textObjects[i + 1].page]
        }

        if (

            (
                textObjects[i].isHeading

                ||

                currentText.endsWith('.')

                ||

                currentText.endsWith('?')

                ||

                currentText.endsWith('!')

                ||

                isLast
            )

        ) {
            mergedTexts.push({
                ...textObjects[i]
            })
            continue;
        }

        // Entfernen des Bindestrichs am Ende, wenn vorhanden

        let zwischenzeichen = " ";
        if (currentText.endsWith('-')) {
            currentText = currentText.slice(0, -1);

            zwischenzeichen = "";
        }

        textObjects[i + 1].text = currentText + zwischenzeichen + nextText
        textObjects[i + 1].page = [...new Set([...currentPage, ...nextPage])]

    }

    return mergedTexts;
}





function cropImageByPercentage(dataURL, xPercent, yPercent, widthPercent, heightPercent) {
    return new Promise((resolve, reject) => {
        var img = new Image();
        img.onload = function () {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');

            // Berechne die tatsächlichen Pixelwerte basierend auf den Prozentangaben
            var sx = this.width * xPercent / 100;
            var sy = this.height * yPercent / 100;
            var sWidth = this.width * widthPercent / 100;
            var sHeight = this.height * heightPercent / 100;

            canvas.width = sWidth;
            canvas.height = sHeight;

            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

            resolve(canvas.toDataURL());
        };
        img.onerror = reject;
        img.src = dataURL;
    });
}



export default extractText;