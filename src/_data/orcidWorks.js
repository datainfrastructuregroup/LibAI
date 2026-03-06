// This file is a global data file for Eleventy.
// Eleventy will automatically run this function at build time and make
// the returned data available to all templates under the name "orcidWorks".

// EleventyFetch is a helper that fetches URLs from the internet AND caches
// the responses locally so we don't hammer the ORCID API on every build.
const EleventyFetch = require("@11ty/eleventy-fetch");

// Node's built-in file system module — lets us read files from disk.
const fs = require("fs");

// Node's built-in path module — helps us build file paths that work on
// both Mac/Linux and Windows (e.g. handles / vs \ automatically).
const path = require("path");

// gray-matter parses the YAML front matter out of markdown files.
// Given a .md file, it splits it into { data: {...}, content: "..." }
// where data is the front matter fields (like orcid, title, etc.)
const matter = require("gray-matter");

// Eleventy expects a global data file to export either an object or a function.
// We export an async function because we need to make network requests (await).
module.exports = async function () {

  // Build an absolute path to the /src/people directory.
  // __dirname is the folder THIS file lives in (src/_data),
  // so "../people" goes one level up then into /people.
  const peopleDir = path.join(__dirname, "../people");

  // Read every file in that folder, then keep only the ones ending in ".md".
  // This gives us an array of filenames like ["alice.md", "bob.md", ...]
  const files = fs.readdirSync(peopleDir).filter(f => f.endsWith(".md"));

  // This array will hold one object per WORK (not per person).
  // By the end of the loop it might look like:
  // [
  //   { personName: "Alice", personUrl: "/people/alice", title: "Some Paper", year: 2023 },
  //   { personName: "Bob",   personUrl: "/people/bob",   title: "Other Paper", year: 2021 },
  //   ...
  // ]
  const allWorks = [];

  // Loop through each markdown file one at a time.
  // We use for...of (not forEach) because we need to use await inside the loop.
  for (const file of files) {

    // Read the full text content of the file from disk.
    const content = fs.readFileSync(path.join(peopleDir, file), "utf-8");

    // Use gray-matter to parse out just the front matter fields.
    // We use destructuring to grab only `data` (the front matter object)
    // and ignore the markdown body content.
    const { data } = matter(content);

    // If this person doesn't have an orcid field in their front matter,
    // skip them and move on to the next file.
    if (!data.orcid) continue;

    // Derive the person's page URL from their filename.
    // e.g. "alice-smith.md" -> "/people/alice-smith"
    // .replace() removes the ".md" extension from the filename string.
    const slug = file.replace(".md", "");
    const personUrl = `/people/${slug}`;

    // Wrap the API call in try/catch so that one bad ORCID ID or network
    // error doesn't crash the entire build — it just logs a warning.
    try {

      // Build the ORCID API URL for this person's list of works.
      const url = `https://pub.orcid.org/v3.0/${data.orcid}/works`;

      // Fetch the URL (or load it from local cache if we fetched it recently).
      // duration: "1d" means "reuse the cached version for up to 1 day".
      // type: "json" means parse the response body as JSON automatically.
      // The Accept header tells the ORCID API we want JSON, not XML.
      const response = await EleventyFetch(url, {
        duration: "1d",
        type: "json",
        fetchOptions: {
          headers: { Accept: "application/json" }
        }
      });

      // ORCID returns works grouped in an array called "group".
      // If it's missing for some reason, fall back to an empty array
      // so the for loop below has nothing to iterate over (rather than crashing).
      const works = response.group || [];

      // Loop through each work this person has on ORCID.
      for (const group of works) {

        // Each group can have multiple summaries (e.g. if the same work was
        // added more than once). We just grab the first one [0].
        const work = group["work-summary"][0];

        // Try to pull out the publication year as a number (e.g. 2023).
        // The && checks make sure we don't crash if any of these nested
        // fields are missing — if anything is absent, we store null instead.
        const year =
          work["publication-date"] && work["publication-date"].year
            ? parseInt(work["publication-date"].year.value)
            : null;

        // Push a flat, simple object into allWorks for this one work.
        // We store everything we need to render a citation line in the template.
        allWorks.push({
          personName: data.title || data.name, // whichever field stores their name
          personUrl: personUrl,
          title: work.title.title.value,
          year: year
        });
      }

    } catch (e) {
      // If anything went wrong (bad network, invalid ORCID, API down, etc.),
      // print a warning to the console but keep going through the other people.
      console.warn(`Could not fetch ORCID works for ${data.orcid}:`, e.message);
    }
  }

  // Sort the flat list of all works by year, most recent first.
  // Array.sort() takes a comparison function with two items (a, b).
  // The rules are:
  //   return negative → a comes first
  //   return positive → b comes first
  //   return 0        → order doesn't matter
  // Works with no year (null) get pushed to the bottom.
  allWorks.sort((a, b) => {
    if (a.year === null && b.year === null) return 0;  // both unknown, leave as-is
    if (a.year === null) return 1;                     // a has no year, b goes first
    if (b.year === null) return -1;                    // b has no year, a goes first
    return b.year - a.year;                            // both have years, sort descending
  });

  // Return the completed array. Eleventy will make this available in templates
  // as the variable `orcidWorks` (named after this file: orcidWorks.js).
  return allWorks;
};