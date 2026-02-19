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

  // convert citations to footnotes
  eleventyConfig.addTransform("citations-to-footnotes", function(content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;

    let citationIndex = 1;
    const usedCitations = {};
    const citationOrder = [];

    content = content.replace(/\[\s*@\s*([^\]\s]+)\s*\]/g, (match, key) => {
      if (!bibliography[key]) return match;

      if (!usedCitations[key]) {
        usedCitations[key] = citationIndex++;
        citationOrder.push(key);
      }

      const number = usedCitations[key];
      return `<sup id="cite-${number}">
                <a href="#footnote-${number}">[${number}]</a>
              </sup>`;
    });

    if (citationOrder.length === 0) return content;

    let footnotesHTML = `<section class="footnotes"><hr><ol>`;
    citationOrder.forEach(key => {
      const number = usedCitations[key];
      const entry = bibliography[key];

      const titleMatch = entry.match(/title\s*=\s*\{([\s\S]*?)\}/i);
      const orgMatch = entry.match(/organization\s*=\s*\{([\s\S]*?)\}/i);
      const dateMatch = entry.match(/date\s*=\s*\{([\s\S]*?)\}/i);
      const urlMatch = entry.match(/url\s*=\s*\{([\s\S]*?)\}/i);

      const title = titleMatch ? cleanBibField(titleMatch[1]) : "";
      const org = orgMatch ? cleanBibField(orgMatch[1]) : "";
      const year = dateMatch ? getYear(cleanBibField(dateMatch[1])) : "";
      const url = urlMatch ? cleanBibField(urlMatch[1]) : "";

    footnotesHTML += `<li id="footnote-${number}">
      <strong>${title}</strong>${org ? ". " + org : ""}${year ? ", " + year : ""}${url ? `. <a href="${url}" target="_blank">${url}</a>` : ""} <a href="#cite-${number}">↩</a>
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



// OLD
// export default function(eleventyConfig) {
//   // Add markdown plugins
//   let markdownLib = markdownIt({
//     html: true,
//     linkify: true,
//     typographer: true
//   }).use(markdownItWikilinks({
//     baseURL: `${process.env.ELEVENTY_BASEPATH || ''}/notes/`,
//     makeAllLinksAbsolute: true
//   }));

//   eleventyConfig.setLibrary('md', markdownLib);

//   // Add citations plugin
//   eleventyConfig.addPlugin(citationsPlugin, {
//     bibliography: ['src/_data/libAI.bib']
//   });

//   // Create a collection for all notes
//   eleventyConfig.addCollection('notes', function(collectionApi) {
//     return collectionApi.getFilteredByGlob('src/notes/*.md')
//       .filter(item => !item.data.eleventyNavigation);
//   });

//   // Copy assets
//   eleventyConfig.addPassthroughCopy('src/css');
//   eleventyConfig.addPassthroughCopy('src/js');
//   eleventyConfig.addPassthroughCopy('src/assets');
//     eleventyConfig.addPassthroughCopy('.garden-graph.json');

//   // Add string contains filter
//   eleventyConfig.addFilter('contains', function(str, search) {
//     return str.includes(search);
//   });

//   // Add filter to get notes without circular reference
//   eleventyConfig.addFilter('getNotes', function(allNotes) {
//     return allNotes.filter(note => 
//       note.inputPath.startsWith('src/notes/') && 
//       note.url !== '/notes/' // Exclude the notes index
//     );
//   });

//   // Add filter to get backlinks
//   eleventyConfig.addFilter('getBacklinks', function(notes, currentPage) {
//     if (!notes || !currentPage) return [];
    
//     const currentUrl = currentPage.url;
//     return notes.filter(note => {
//       if (!note.templateContent || note.url === currentUrl) return false;
//       const content = note.templateContent.toLowerCase();
//       const noteUrl = note.url.toLowerCase();
//       return content.includes(currentUrl) && noteUrl !== currentUrl;
//     });
//   });

//   // Add filter to get items by tag
//   eleventyConfig.addFilter('getTaggedItems', function(items, tag) {
//     if (!items || !tag) return [];
    
//     return items.filter(item => {
//       if (!item.data || !item.data.tags) return false;
//       return item.data.tags.includes(tag);
//     });
//   });

//   // Add filter to get entry by URL
//   eleventyConfig.addFilter('getEntryByUrl', function(collection, url) {
//     if (!collection || !url) return null;
    
//     return collection.find(item => item.url === url);
//   });

//   // Add global data for complete bibliography
//   eleventyConfig.addGlobalData('completeBibliography', function() {
//     return bibliographyGenerator.generateCompleteBibliography();
//   });

  // return {
  //   dir: {
  //     input: 'src',
  //     output: '_site',
  //     includes: '_includes',
  //     layouts: '_includes/layouts',
  //     data: '_data'
  //   },
  //   templateFormats: ['md', 'njk', 'html'],
  //   markdownTemplateEngine: 'njk',
  //   htmlTemplateEngine: 'njk',
  //   dataTemplateEngine: 'njk',
  //   pathPrefix: process.env.ELEVENTY_BASEPATH || '/'
  // };
// };
// OLD
