---
title: Liberation + AI Think Tank
layout: base.njk
---

# Something about the Content

## Recently Added... 

{% for note in collections.notes | reverse %}
- [{{ note.data.title | default(note.fileSlug) }}]({{ note.url }})
{% endfor %}

## tech... Getting Started

1. Add markdown files to the `src/notes` directory
2. Link between notes using `\[\[note-name\]\]`
3. Backlinks are automatically generated
