---
title: Liberation + AI Think Tank
layout: base.njk
---

# TESTING TESTING

## Recently Added... 

{% for note in collections.notes | reverse %}
- [{{ note.data.title | default(note.fileSlug) }}]({{ note.url }})
{% endfor %}

