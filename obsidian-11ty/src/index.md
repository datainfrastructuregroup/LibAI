---
title: Welcome to Obsidian 11ty
layout: layouts/base.njk
---

# Welcome to Obsidian 11ty

A digital garden built with 11ty, inspired by Obsidian Publish.

## Recent Notes

{% for note in collections.notes | reverse %}
- [{{ note.data.title | default(note.fileSlug) }}]({{ note.url }})
{% endfor %}

## Getting Started

1. Add markdown files to the `src/notes` directory
2. Link between notes using `\[\[note-name\]\]`
3. Backlinks are automatically generated

## Example Notes

- [Example Note](/notes/example-note/)
- [Another Note](/notes/another-note/)
