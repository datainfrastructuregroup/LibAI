// import fs from "fs";
// import MarkdownIt from "markdown-it";

// // parse the bibtex
// function parseBibtexFile(filePath) {
//   const content = fs.readFileSync(filePath, "utf8");
//   const entries = {};
//   const regex = /@.*?\{(.*?),([\s\S]*?)\n\}/g;
//   for (const match of content.matchAll(regex)) {
//     const key = match[1].trim();
//     const body = match[2].trim();
//     entries[key] = body;
//   }
//   return entries;
// }

// const bibliography = parseBibtexFile("src/_data/libAI.bib");

// // clean the bibtex formatting
// function cleanBibField(str) {
//   if (!str) return "";
//   return str.replace(/[\{\}]/g, "").replace(/\\&/g, "&").trim();
// }

// function getYear(str) {
//   if (!str) return "";
//   const match = str.match(/^(\d{4})/);
//   return match ? match[1] : str;
// }

// // main function
// export default function(eleventyConfig) {
//   const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
//   eleventyConfig.setLibrary("md", md);

//   // convert citations to footnotes with page numbers
//   eleventyConfig.addTransform("citations-to-footnotes", function(content, outputPath) {
//     if (!outputPath || !outputPath.endsWith(".html")) return content;

//     let citationIndex = 1;
//     const usedCitations = {};
//     const citationOrder = [];
//     const citationPages = {};
//     const WORDS_PER_PAGE = 250;

//     // First pass: find all citations and calculate their page numbers
//     const citationMatches = [];
//     let match;
//     const regex = /\[\s*@\s*([^\]\s]+)\s*\]/g;
//     while ((match = regex.exec(content)) !== null) {
//       citationMatches.push({
//         key: match[1],
//         index: match.index,
//         fullMatch: match[0]
//       });
//     }

//     // Calculate page numbers based on text position
//     citationMatches.forEach(item => {
//       const textBefore = content.substring(0, item.index);
//       const wordCount = textBefore.split(/\s+/).filter(w => w.length > 0).length;
//       const pageNumber = Math.max(1, Math.floor(wordCount / WORDS_PER_PAGE) + 1);
      
//       if (!usedCitations[item.key]) {
//         usedCitations[item.key] = citationIndex++;
//         citationOrder.push(item.key);
//         citationPages[item.key] = pageNumber;
//         console.log(`✅ Found citation: ${item.key} → [${usedCitations[item.key]}] on page ${pageNumber}`);
//       }
//     });

//     // Second pass: replace citations with footnote links
//     content = content.replace(/\[\s*@\s*([^\]\s]+)\s*\]/g, (match, key) => {
//       if (!bibliography[key]) {
//         console.warn(`⚠️  Citation key not found: ${key}`);
//         return match;
//       }

//       const number = usedCitations[key];
//       return `<sup id="cite-${number}">
//                 <a href="#footnote-${number}">[${number}]</a>
//               </sup>`;
//     });

//     if (citationOrder.length === 0) return content;

//     console.log(`📚 Total citations found: ${citationOrder.length}`);

//     let footnotesHTML = `<section class="footnotes"><hr><ol>`;
//     citationOrder.forEach(key => {
//       const number = usedCitations[key];
//       const entry = bibliography[key];
//       const pageNumber = citationPages[key];

//       if (!entry) {
//         console.warn(`⚠️  Entry not found for key: ${key}`);
//         return;
//       }

//       const titleMatch = entry.match(/title\s*=\s*\{([\s\S]*?)\}/i);
//       const authorMatch = entry.match(/author\s*=\s*\{([\s\S]*?)\}/i);
//       const orgMatch = entry.match(/organization\s*=\s*\{([\s\S]*?)\}/i);
//       const journalMatch = entry.match(/journaltitle\s*=\s*\{([\s\S]*?)\}/i);
//       const dateMatch = entry.match(/date\s*=\s*\{([\s\S]*?)\}/i);
//       const volumeMatch = entry.match(/volume\s*=\s*\{([\s\S]*?)\}/i);
//       const numberMatch = entry.match(/number\s*=\s*\{([\s\S]*?)\}/i);
//       const urlMatch = entry.match(/url\s*=\s*\{([\s\S]*?)\}/i);
//       const pagesMatch = entry.match(/pages\s*=\s*\{([\s\S]*?)\}/i);
//       const doiMatch = entry.match(/doi\s*=\s*\{([\s\S]*?)\}/i);

//       const title = titleMatch ? cleanBibField(titleMatch[1]) : "";
//       const author = authorMatch ? cleanBibField(authorMatch[1]).split(" and ")[0] : "";
//       const org = orgMatch ? cleanBibField(orgMatch[1]) : "";
//       const journal = journalMatch ? cleanBibField(journalMatch[1]) : "";
//       const year = dateMatch ? getYear(cleanBibField(dateMatch[1])) : "";
//       const volume = volumeMatch ? cleanBibField(volumeMatch[1]) : "";
//       const issueNum = numberMatch ? cleanBibField(numberMatch[1]) : "";
//       const pages = pagesMatch ? cleanBibField(pagesMatch[1]) : "";
//       const url = urlMatch ? cleanBibField(urlMatch[1]) : "";
//       const doi = doiMatch ? cleanBibField(doiMatch[1]) : "";

//       // Build citation based on source type
//       let citationText = `<strong>${title}</strong>`;
      
//       if (journal) {
//         // Journal article format: Author. "Title." Journal, vol. X, no. Y, year, pp. Z-Z.
//         citationText += author ? `. ${author}` : "";
//         citationText += journal ? `. <em>${journal}</em>` : "";
//         if (volume) {
//           citationText += `, vol. ${volume}`;
//           if (issueNum) citationText += `, no. ${issueNum}`;
//         }
//         if (year) citationText += `, ${year}`;
//         if (pages) citationText += `, pp. ${pages}`;
//       } else if (org) {
//         // Report/book format
//         citationText += `. ${org}`;
//         if (year) citationText += `, ${year}`;
//         if (pages) citationText += `, pp. ${pages}`;
//         else citationText += `, p. ${pageNumber}`;
//       } else {
//         // Website/online source - no pages
//         if (year) citationText += `, ${year}`;
//         // Don't add pages for website-only sources
//       }

//       // Add URL or DOI link
//       let linkHtml = "";
//       if (url) {
//         linkHtml = `. <a href="${url}" target="_blank">${url}</a>`;
//       } else if (doi) {
//         linkHtml = `. <a href="https://doi.org/${doi}" target="_blank">https://doi.org/${doi}</a>`;
//       }

//       footnotesHTML += `<li id="footnote-${number}">
//       ${citationText}${linkHtml} <a href="#cite-${number}">↩</a>
//     </li>`;
//     });
//     footnotesHTML += `</ol></section>`;

//     return content + footnotesHTML;
//   });

//   eleventyConfig.addFilter("getEntryByUrl", (collection, url) => {
//     if (!collection || !url) return null;
//     return collection.find(item => item.url === url);
//   });

//   eleventyConfig.addFilter("getBacklinks", (notes, currentPage) => {
//     if (!notes || !currentPage) return [];
//     const currentUrl = currentPage.url;
//     return notes.filter(note => {
//       if (!note.templateContent || note.url === currentUrl) return false;
//       const content = note.templateContent.toLowerCase();
//       const noteUrl = note.url.toLowerCase();
//       return content.includes(currentUrl) && noteUrl !== currentUrl;
//     });
//   });

//   eleventyConfig.addCollection("notes", collectionApi =>
//     collectionApi.getFilteredByGlob("src/notes/**/*.md")
//   );

//   return {
//     dir: {
//       input: "src",
//       output: "_site",
//       includes: "_includes/layouts",
//       data: "_data"
//     },
//     templateFormats: ["md", "njk", "html"],
//     markdownTemplateEngine: "njk",
//     htmlTemplateEngine: "njk",
//     dataTemplateEngine: "njk"
//   };
// }

import fs from "fs";
import MarkdownIt from "markdown-it";

// parse the bibtex
function parseBibtexFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const entries = {};
  const regex = /@.*?\{(.*?),([\s\S]*?)\n\}/g;
  for (const match of content.matchAll(regex)) {
    const key = match[1].trim();
    const body = match[2].trim();
    entries[key] = body;
  }
  return entries;
}

const bibliography = parseBibtexFile("src/_data/libAI.bib");

// clean the bibtex formatting
function cleanBibField(str) {
  if (!str) return "";
  return str.replace(/[\{\}]/g, "").replace(/\\&/g, "&").trim();
}

function getYear(str) {
  if (!str) return "";
  const match = str.match(/^(\d{4})/);
  return match ? match[1] : str;
}

// main function
export default function(eleventyConfig) {
  const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
  eleventyConfig.setLibrary("md", md);

  // convert citations to footnotes with page numbers
  eleventyConfig.addTransform("citations-to-footnotes", function(content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;

    let citationIndex = 1;
    const usedCitations = {};
    const citationOrder = [];
    const citationPages = {};
    const WORDS_PER_PAGE = 250;

    // First pass: find all citations and calculate their page numbers
    const citationMatches = [];
    let match;
    const regex = /\[\s*@\s*([^\]\s]+)\s*\]/g;
    while ((match = regex.exec(content)) !== null) {
      citationMatches.push({
        key: match[1],
        index: match.index,
        fullMatch: match[0]
      });
    }

    // Calculate page numbers based on text position
    citationMatches.forEach(item => {
      const textBefore = content.substring(0, item.index);
      const wordCount = textBefore.split(/\s+/).filter(w => w.length > 0).length;
      const pageNumber = Math.max(1, Math.floor(wordCount / WORDS_PER_PAGE) + 1);
      
      if (!usedCitations[item.key]) {
        usedCitations[item.key] = citationIndex++;
        citationOrder.push(item.key);
        citationPages[item.key] = pageNumber;
        console.log(`✅ Found citation: ${item.key} → [${usedCitations[item.key]}] on page ${pageNumber}`);
      }
    });

    // Second pass: replace citations with footnote links
    content = content.replace(/\[\s*@\s*([^\]\s]+)\s*\]/g, (match, key) => {
      if (!bibliography[key]) {
        console.warn(`⚠️  Citation key not found: ${key}`);
        return match;
      }

      const number = usedCitations[key];
      return `<sup id="cite-${number}">
                <a href="#footnote-${number}">[${number}]</a>
              </sup>`;
    });

    if (citationOrder.length === 0) return content;

    console.log(`📚 Total citations found: ${citationOrder.length}`);

    let footnotesHTML = `<section class="footnotes"><hr><ol>`;
    citationOrder.forEach(key => {
      const number = usedCitations[key];
      const entry = bibliography[key];
      const pageNumber = citationPages[key];

      if (!entry) {
        console.warn(`⚠️  Entry not found for key: ${key}`);
        return;
      }

      const titleMatch = entry.match(/title\s*=\s*\{([\s\S]*?)\}/i);
      const authorMatch = entry.match(/author\s*=\s*\{([\s\S]*?)\}/i);
      const orgMatch = entry.match(/organization\s*=\s*\{([\s\S]*?)\}/i);
      const journalMatch = entry.match(/journaltitle\s*=\s*\{([\s\S]*?)\}/i);
      const dateMatch = entry.match(/date\s*=\s*\{([\s\S]*?)\}/i);
      const volumeMatch = entry.match(/volume\s*=\s*\{([\s\S]*?)\}/i);
      const numberMatch = entry.match(/number\s*=\s*\{([\s\S]*?)\}/i);
      const urlMatch = entry.match(/url\s*=\s*\{([\s\S]*?)\}/i);
      const pagesMatch = entry.match(/pages\s*=\s*\{([\s\S]*?)\}/i);
      const doiMatch = entry.match(/doi\s*=\s*\{([\s\S]*?)\}/i);

      const title = titleMatch ? cleanBibField(titleMatch[1]) : "";
      const author = authorMatch ? cleanBibField(authorMatch[1]).split(" and ")[0] : "";
      const org = orgMatch ? cleanBibField(orgMatch[1]) : "";
      const journal = journalMatch ? cleanBibField(journalMatch[1]) : "";
      const year = dateMatch ? getYear(cleanBibField(dateMatch[1])) : "";
      const volume = volumeMatch ? cleanBibField(volumeMatch[1]) : "";
      const issueNum = numberMatch ? cleanBibField(numberMatch[1]) : "";
      const pages = pagesMatch ? cleanBibField(pagesMatch[1]) : "";
      const url = urlMatch ? cleanBibField(urlMatch[1]) : "";
      const doi = doiMatch ? cleanBibField(doiMatch[1]) : "";

      // Build citation based on source type
      let citationText = `<strong>${title}</strong>`;
      
      if (journal) {
        // Journal article format: Author. "Title." Journal, vol. X, no. Y, year, pp. Z-Z.
        citationText += author ? `. ${author}` : "";
        citationText += journal ? `. <em>${journal}</em>` : "";
        if (volume) {
          citationText += `, vol. ${volume}`;
          if (issueNum) citationText += `, no. ${issueNum}`;
        }
        if (year) citationText += `, ${year}`;
        if (pages) citationText += `, pp. ${pages}`;
      } else if (url && !org) {
        // Website/online source - no pages (has URL but no organization or journal)
        if (year) citationText += `, ${year}`;
        // Don't add pages for website-only sources
      } else if (org && pages) {
        // Report/book format WITH explicit pages
        citationText += `. ${org}`;
        if (year) citationText += `, ${year}`;
        citationText += `, pp. ${pages}`;
      } else if (org && !pages && !url) {
        // Report/book format WITHOUT URL or pages - use estimated page
        citationText += `. ${org}`;
        if (year) citationText += `, ${year}`;
        citationText += `, p. ${pageNumber}`;
      } else if (org && url) {
        // Organization with URL (likely website) - no pages
        citationText += `. ${org}`;
        if (year) citationText += `, ${year}`;
        // Don't add pages when URL is present
      } else {
        // Fallback: just year
        if (year) citationText += `, ${year}`;
      }

      // Add URL or DOI link
      let linkHtml = "";
      if (url) {
        linkHtml = `. <a href="${url}" target="_blank">${url}</a>`;
      } else if (doi) {
        linkHtml = `. <a href="https://doi.org/${doi}" target="_blank">https://doi.org/${doi}</a>`;
      }

      footnotesHTML += `<li id="footnote-${number}">
      ${citationText}${linkHtml} <a href="#cite-${number}">↩</a>
    </li>`;
    });
    footnotesHTML += `</ol></section>`;

    return content + footnotesHTML;
  });

  eleventyConfig.addFilter("getEntryByUrl", (collection, url) => {
    if (!collection || !url) return null;
    return collection.find(item => item.url === url);
  });

  eleventyConfig.addFilter("getBacklinks", (notes, currentPage) => {
    if (!notes || !currentPage) return [];
    const currentUrl = currentPage.url;
    return notes.filter(note => {
      if (!note.templateContent || note.url === currentUrl) return false;
      const content = note.templateContent.toLowerCase();
      const noteUrl = note.url.toLowerCase();
      return content.includes(currentUrl) && noteUrl !== currentUrl;
    });
  });

  eleventyConfig.addCollection("notes", collectionApi =>
    collectionApi.getFilteredByGlob("src/notes/**/*.md")
  );

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes/layouts",
      data: "_data"
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
}