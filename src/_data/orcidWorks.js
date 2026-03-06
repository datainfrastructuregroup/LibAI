// ES module imports
import EleventyFetch from "@11ty/eleventy-fetch";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath } from "url";

// ES module equivalent of __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function () {

  const peopleDir = path.join(__dirname, "../people");
  const files = fs.readdirSync(peopleDir).filter(f => f.endsWith(".md"));

  // We use a Map instead of an array this time.
  // A Map lets us look up works by a unique key (the DOI, or the title as fallback).
  // This is how we deduplicate — if two people share a work, we find it in the
  // Map by its DOI and just add the second person as a co-author instead of
  // creating a duplicate entry.
  // Map structure: key = DOI string (or title), value = work object
  const worksMap = new Map();

  for (const file of files) {
    const content = fs.readFileSync(path.join(peopleDir, file), "utf-8");
    const { data } = matter(content);

    if (!data.orcid) continue;

    const slug = file.replace(".md", "");
    const personUrl = `/people/${slug}`;

    try {
      const url = `https://pub.orcid.org/v3.0/${data.orcid}/works`;
      const response = await EleventyFetch(url, {
        duration: "1d",
        type: "json",
        fetchOptions: {
          headers: { Accept: "application/json" }
        }
      });

      const works = response.group || [];

      for (const group of works) {
        const work = group["work-summary"][0];

        // Extract the title string
        const title = work.title.title.value;

        // ORCID stores external identifiers (like DOIs) in an array.
        // We look through that array for one with type "doi".
        // If there's no external-ids field at all, we fall back to an empty array.
        const externalIds = (work["external-ids"] && work["external-ids"]["external-id"]) || [];
        const doiEntry = externalIds.find(id => id["external-id-type"] === "doi");

        // If we found a DOI, store the raw DOI value (e.g. "10.1234/example")
        // and build a full URL from it (e.g. "https://doi.org/10.1234/example")
        const doi = doiEntry ? doiEntry["external-id-value"] : null;
        const doiUrl = doi ? `https://doi.org/${doi}` : null;

        // Use the DOI as our deduplication key — it's a globally unique identifier.
        // If there's no DOI, fall back to using the title string as the key.
        // This isn't perfect but handles works that lack a DOI.
        const key = doi || title;

        // Extract journal/venue name if ORCID has it
        const journal = work["journal-title"] ? work["journal-title"].value : null;

        // Extract year
        const year =
          work["publication-date"] && work["publication-date"].year
            ? parseInt(work["publication-date"].year.value)
            : null;

        // Build a small object representing this contributor's authorship
        const author = {
          name: data.title,  // the person's display name from front matter
          url: personUrl
        };

        if (worksMap.has(key)) {
          // This work already exists in our Map (another contributor had it too).
          // Just push this person into the existing work's authors array.
          worksMap.get(key).authors.push(author);
        } else {
          // This is a new work we haven't seen before — add it to the Map.
          worksMap.set(key, {
            title,
            doiUrl,   // full https://doi.org/... link, or null
            journal,  // journal/venue name, or null
            year,
            authors: [author]  // start the authors array with this person
          });
        }
      }

    } catch (e) {
      console.warn(`Could not fetch ORCID works for ${data.orcid}:`, e.message);
    }
  }

  // Convert the Map's values into a plain array so Eleventy/Nunjucks can loop over it.
  // Map.values() returns an iterator, so we wrap it in Array.from() to get a real array.
  const allWorks = Array.from(worksMap.values());

  // Sort by year descending (most recent first), nulls at the bottom
  allWorks.sort((a, b) => {
    if (a.year === null && b.year === null) return 0;
    if (a.year === null) return 1;
    if (b.year === null) return -1;
    return b.year - a.year;
  });

  // Only return works from 2020 onwards.
  // Works with no year (null) are kept since we can't confirm they're too old.
  return allWorks.filter(work => work.year === null || work.year >= 2020);};