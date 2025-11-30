---
title: "Citations Example"
description: "Example of how to use citations in notes"
layout: note.njk
---

# Citations Example

This note demonstrates how to use BibTeX citations in your markdown files. The system automatically detects citations and adds a "Works Cited" section at the bottom of any page that contains citations.

## How to Use Citations

To cite a work, use the following syntax in your markdown:

`[@citationKey]`

For multiple citations, separate them with semicolons:

`[@citationKey1;@citationKey2]`

## Example Citations

Here are some example citations from the BibTeX library:

The concept of liberatory technology has been explored by various scholars [@herber1965Liberatory;@illichTools]. Recent work on AI ethics has highlighted the importance of community-led approaches [@croskey2025Liberatory;@browne2023Feminist].

The TESCREAL bundle has been critically analyzed by Gebru and Torres [@gebru2024TESCREAL], while the economic implications of AI have been examined by Alexander [@alexander2025Data].

## Multiple Citations

You can cite multiple sources in one reference [@aguerayarcas2025What;@hao2025Empire;@muldoon2024Feeding].

## What Happens Automatically

1. Citations are detected in the format `[@key]`
2. A "Works Cited" section is automatically added to the bottom of the page
3. Each citation is formatted in academic style
4. Links and DOIs are preserved and made clickable

The system will automatically generate a properly formatted works cited section below this content.
