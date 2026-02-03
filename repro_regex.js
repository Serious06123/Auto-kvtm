const fs = require('fs');
const path = require('path');

const filePath = 'e:\\Auto-kvtm\\src\\tools\\sky-garden\\auto\\vp-1.js';
const txt = fs.readFileSync(filePath, 'utf8');

const prodMatch = txt.match(/const produceItems\s*=\s*async[\s\S]*?\{([\s\S]*?)\}\s*(?=const sellItems|const sellItems\s*=|$)/m);

if (prodMatch && prodMatch[1]) {
    let body = prodMatch[1];
    console.log("--- BODY START ---");
    console.log(body);
    console.log("--- BODY END ---");

    const regex = /if\s*\(!isLast\)\s*\{[\s\S]*?\}/g;
    const match = body.match(regex);
    console.log("--- REGEX MATCH ---");
    console.log(match);

    // Testing specific replacement
    const newBody = body.replace(regex, '[[REPLACED]]');
    console.log("--- NEW BODY ---");
    console.log(newBody);
} else {
    console.log("Production block not found");
}
