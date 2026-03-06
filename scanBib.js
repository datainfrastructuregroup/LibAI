import fs from "fs";
import path from "path";
import bibtexParsePkg from "bibtex-parse-js";
const bibtexParse = bibtexParsePkg.default || bibtexParsePkg;

// CONFIG: starting folder and BibTeX file
const folderPath = "./_site/notes"; // change to your subfolder in _site
const bibFilePath = "./src/_data/libAI.bib"; // your BibTeX file

// ---------- Step 1: Load BibTeX file ----------
function loadBibFile(filePath) {
  const bibFile = fs.readFileSync(filePath, "utf8");
  const parsed = bibtexParse.toJSON(bibFile);
  const bibDB = {};

  parsed.forEach(entry => {
    const key = entry.citationKey;
    const tags = entry.entryTags;
    const author = tags.author || "Unknown author";
    const title = tags.title || "Untitled";
    const year = tags.year || "n.d.";
    bibDB[key] = `${author}. ${title}. ${year}.`;
  });

  return bibDB;
}

const bibDB = loadBibFile(bibFilePath);

// ---------- Step 2: Recursively get all HTML files ----------
function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results = results.concat(getHtmlFiles(filePath));
    } else if (file.endsWith(".html")) {
      results.push(filePath);
    }
  });

  return results;
}

// ---------- Step 3: Regex for citations ----------
const citeRegex = /(\\{0,2}cite\{([^}]+)\})|(\[@([^\]]+)\])/g;

// ---------- Step 4: Process each HTML file ----------
const htmlFiles = getHtmlFiles(folderPath);

htmlFiles.forEach(filePath => {
  let html = fs.readFileSync(filePath, "utf8");
  const text = html.replace(/<[^>]*>/g, " "); // strip HTML tags for scanning

  const footnotes = [];
  let footnoteIndex = 1;

  // Replace citations with <sup> numbers
  html = html.replace(citeRegex, (match, latex, latexKeys, md, mdKeys) => {
    let keys = [];
    if (latexKeys) keys = latexKeys.split(",").map(k => k.trim());
    if (mdKeys) keys = mdKeys.split(/;|,/).map(k => k.trim());

    const superscripts = keys.map(key => {
      const citation = bibDB[key] || key; // fallback to key if missing
      footnotes.push({ index: footnoteIndex, citation });
      return `<sup id="fnref${footnoteIndex}">${footnoteIndex++}</sup>`;
    });

    return superscripts.join(", ");
  });

  // Append footnotes at the end of body
  if (footnotes.length > 0) {
    html += "\n<div class='footnotes'><hr><ol>";
    footnotes.forEach(fn => {
      html += `<li id="fn${fn.index}">${fn.citation}</li>`;
    });
    html += "</ol></div>";
  }

  // Save back to file
  fs.writeFileSync(filePath, html, "utf8");

  if (footnotes.length > 0) {
    console.log(`Processed ${path.relative(folderPath, filePath)} — added ${footnotes.length} footnotes`);
  }
});

console.log("\n✅ Done! All HTML pages now have footnotes.");



