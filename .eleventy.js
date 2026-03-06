import fs from "fs";
import MarkdownIt from "markdown-it";






// TESTING


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
  return str
    .replace(/\\mkbibemph\{([^}]*)\}/g, "$1") // Remove \mkbibemph{} commands but keep content
    .replace(/\\textbf\{([^}]*)\}/g, "$1")     // Remove \textbf{} commands but keep content  
    .replace(/\\textit\{([^}]*)\}/g, "$1")     // Remove \textit{} commands but keep content
    .replace(/\\textsc\{([^}]*)\}/g, "$1")     // Remove \textsc{} commands but keep content
    .replace(/[\{\}]/g, "")                    // Remove remaining braces
    .replace(/\\&/g, "&")                     // Fix escaped ampersands
    .trim();
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

// Move these lines outside the transform function and resolve the conflict:
eleventyConfig.addPassthroughCopy('src/css');
eleventyConfig.addPassthroughCopy('src/js');
eleventyConfig.addPassthroughCopy('src/assets');
eleventyConfig.addPassthroughCopy('src/.garden-graph.json');

 // convert citations to footnotes with page numbers
 eleventyConfig.addTransform("citations-to-footnotes", function(content, outputPath) {
   if (!outputPath || !outputPath.endsWith(".html")) return content;

   let citationIndex = 1;
   const usedCitations = {};
   const citationOrder = [];
   const citationPages = {}; // Track page numbers for each citation

   // First pass: count words to estimate page numbers (assuming ~250 words per page)
   let wordCount = 0;
   const WORDS_PER_PAGE = 250;

   content = content.replace(/\[\s*@\s*([^\]\s]+)\s*\]/g, (match, key) => {
     if (!bibliography[key]) return match;

     if (!usedCitations[key]) {
       usedCitations[key] = citationIndex++;
       citationOrder.push(key);
       // Calculate approximate page number (start from page 1)
       citationPages[key] = Math.max(1, Math.floor(wordCount / WORDS_PER_PAGE) + 1);
     }


     // Count words before this citation for next iteration
     const textBefore = content.substring(0, content.indexOf(match));
     wordCount = textBefore.split(/\s+/).length;


     const number = usedCitations[key];
     return `<sup id="cite-${number}">
               <a href="#footnote-${number}">[${number}]</a>
             </sup>`;
   });

   function extractBibField(entry, fieldName) {
    const re = new RegExp(`${fieldName}\\s*=\\s*\\{`, "i");
    const m = re.exec(entry);
    if (!m) return "";

    let i = m.index + m[0].length; // right after the opening "{"
    let depth = 1;
    let out = "";

    while (i < entry.length && depth > 0) {
      const ch = entry[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      if (depth > 0) out += ch;
      i++;
    }
    return out.trim();
  }


   if (citationOrder.length === 0) return content;


   let footnotesHTML = `<section class="footnotes"><hr><ol>`;
   citationOrder.forEach(key => {
     const number = usedCitations[key];
     const entry = bibliography[key];
     const pageNumber = citationPages[key];


    //  const titleMatch = entry.match(/title\s*=\s*\{([\s\S]*?)\}/i);
    //  const orgMatch = entry.match(/organization\s*=\s*\{([\s\S]*?)\}/i);
    //  const dateMatch = entry.match(/date\s*=\s*\{([\s\S]*?)\}/i);
    //  const urlMatch = entry.match(/url\s*=\s*\{([\s\S]*?)\}/i);
    //  const pagesMatch = entry.match(/pages\s*=\s*\{([\s\S]*?)\}/i);


    //  const title = titleMatch ? cleanBibField(titleMatch[1]) : "";
    //  const org = orgMatch ? cleanBibField(orgMatch[1]) : "";
    //  const year = dateMatch ? getYear(cleanBibField(dateMatch[1])) : "";
    //  const url = urlMatch ? cleanBibField(urlMatch[1]) : "";
    //  const pages = pagesMatch ? cleanBibField(pagesMatch[1]) : "";

    const title = cleanBibField(extractBibField(entry, "title"));
    const org   = cleanBibField(extractBibField(entry, "organization"));
    const date  = cleanBibField(extractBibField(entry, "date"));
    const url   = cleanBibField(extractBibField(entry, "url"));
    const pages = cleanBibField(extractBibField(entry, "pages"));
    const year  = getYear(date);


     // Add page number to footnote (either from BibTeX or estimated)
     const pageInfo = pages ? `, pp. ${pages}` : `, p. ${pageNumber}`;


   footnotesHTML += `<li id="footnote-${number}">
     <strong>${title}</strong>${org ? ". " + org : ""}${year ? ", " + year : ""}${pageInfo}${url ? `. <a href="${url}" target="_blank">${url}</a>` : ""} <a href="#cite-${number}">↩</a>
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
};



