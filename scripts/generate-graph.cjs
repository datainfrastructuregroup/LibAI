const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

function generateGraph() {
  const projectRoot = path.resolve(__dirname, '..');
  const notesDir   = path.join(projectRoot, 'src/notes');
  const peopleDir  = path.join(projectRoot, 'src/people');
  const outputPath = path.join(projectRoot, 'src/.garden-graph.json');

  console.log('🔍 Debug: projectRoot =', projectRoot);

  try {
    const nodes = [];
    const links = [];

    // We use a Set to avoid adding duplicate links (e.g. if a page wikilinks
    // AND html-links to the same target, we only want one edge).
    const linkSet = new Set();

    // Helper: add a link only if we haven't seen this source→target pair before
    function addLink(source, target, type) {
      const key = `${source}→${target}`;
      if (!linkSet.has(key) && source !== target) {
        linkSet.add(key);
        links.push({ source, target, type });
      }
    }

    // -----------------------------------------------------------------------
    // STEP 1: Collect all files from both notes and people directories.
    // Each entry tracks which directory it came from so we can build the
    // correct URL and layout field for the graph node.
    // -----------------------------------------------------------------------
    const allFiles = [];

    if (fs.existsSync(notesDir)) {
      fs.readdirSync(notesDir)
        .filter(f => f.endsWith('.md'))
        .forEach(f => allFiles.push({ file: f, dir: notesDir, type: 'note' }));
    }

    if (fs.existsSync(peopleDir)) {
      fs.readdirSync(peopleDir)
        .filter(f => f.endsWith('.md'))
        .forEach(f => allFiles.push({ file: f, dir: peopleDir, type: 'person' }));
    }

    console.log(`🔍 Debug: found ${allFiles.length} files total`);

    // -----------------------------------------------------------------------
    // STEP 2: Build a node for every page.
    // We do this in a first pass BEFORE extracting links so that by the time
    // we filter links, every valid node already exists in the map.
    // -----------------------------------------------------------------------
    const nodeMap = new Map(); // slug → node object

    allFiles.forEach(({ file, dir, type }) => {
      const filePath = path.join(dir, file);
      const content  = fs.readFileSync(filePath, 'utf8');
      const { data, content: body } = matter(content);

      const slug = file.replace('.md', '');

      // Build the URL based on whether this is a person or a note
      const url = type === 'person' ? `/people/${slug}/` : `/notes/${slug}/`;

      const node = {
        id:     slug,
        label:  data.title || slug,
        url:    url,
        // Store the layout so graph-visualization.js can color nodes differently
        meta: {
          title:  data.title || slug,
          layout: type === 'person' ? 'person.njk' : 'note.njk'
        },
        // Store a short description for the tooltip
        description: (body || '').trim().slice(0, 200) + '...',
        // Keep the raw body so we can extract links in step 3
        _body: body
      };

      nodes.push(node);
      nodeMap.set(slug, node);
    });

    // -----------------------------------------------------------------------
    // STEP 3: Extract links from each page's frontmatter and body content.
    // We look for three kinds of links:
    //   a) Frontmatter fields: authors, contributors, editors
    //      These may be plain slugs or [[wikilink]] format
    //   b) Wikilinks in the body: [[some-slug]]
    //   c) HTML links in the body: <a href="/notes/slug/"> or /people/slug/
    // -----------------------------------------------------------------------
    allFiles.forEach(({ file, dir }) => {
      const filePath = path.join(dir, file);
      const content  = fs.readFileSync(filePath, 'utf8');
      const { data, content: body } = matter(content);

      const slug = file.replace('.md', '');

      // --- a) Frontmatter wikilinks (authors / contributors / editors) ---
      ['authors', 'contributors', 'editors'].forEach(field => {
        if (!data[field] || !Array.isArray(data[field])) return;

        data[field].forEach(person => {
          if (!person) return;
          // Strip [[ and ]] if present, then normalize to a slug
          const raw = String(person).replace(/^\[\[|\]\]$/g, '').trim();
          // Convert to slug format: lowercase, hyphens for non-alphanumeric chars
          const targetSlug = raw
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

          addLink(slug, targetSlug, field.slice(0, -1)); // 'author', 'contributor', 'editor'
        });
      });

      // --- b) Wikilinks in the body: [[target-slug]] ---
      const wikilinks = (body || '').match(/\[\[([^\]]+)\]\]/g) || [];
      wikilinks.forEach(wl => {
        // Strip the [[ and ]] brackets to get the raw slug
        const raw = wl.slice(2, -2).trim();
        const targetSlug = raw
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        addLink(slug, targetSlug, 'wikilink');
      });

      // --- c) HTML links in the body: href="/notes/slug/" or href="/people/slug/" ---
      // This regex matches href attributes pointing to internal /notes/ or /people/ paths
      const hrefRegex = /href="\/(?:notes|people)\/([^/"]+)\/?"/g;
      let match;
      while ((match = hrefRegex.exec(body || '')) !== null) {
        // match[1] is the slug portion of the URL
        const targetSlug = match[1];
        addLink(slug, targetSlug, 'html-link');
      }
    });

    // -----------------------------------------------------------------------
    // STEP 4: Strip the temporary _body field before writing to JSON
    // (it was only needed for link extraction above)
    // -----------------------------------------------------------------------
    nodes.forEach(n => delete n._body);

    // -----------------------------------------------------------------------
    // STEP 5: Filter out any links whose target node doesn't exist in our map.
    // This handles cases like links to external pages or typos in slugs.
    // -----------------------------------------------------------------------
    const validLinks = links.filter(l => {
      const sourceExists = nodeMap.has(l.source);
      const targetExists = nodeMap.has(l.target);
      if (!targetExists) {
        console.warn(`⚠️  Dropping link: ${l.source} → ${l.target} (target not found)`);
      }
      return sourceExists && targetExists;
    });

    const graphData = { nodes, links: validLinks };

    // -----------------------------------------------------------------------
    // STEP 6: Write the graph JSON file
    // -----------------------------------------------------------------------
    const dataDir = path.dirname(outputPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(graphData, null, 2));

    console.log(`✅ Graph generated: ${nodes.length} nodes, ${validLinks.length} edges`);
    console.log(`📁 Graph data saved to: ${outputPath}`);

    return graphData;

  } catch (error) {
    console.error('❌ Error generating graph:', error);
    return null;
  }
}

module.exports = { generateGraph };