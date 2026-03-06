---
title: All Notes
layout: base.njk
---

# All Entries



## Corporate AI
Corporate AI is a term to describe the ways that powerful technology corporations control what AI products are built and how they are developed and governed. There are as many ways to approach AI development as there are innovative applications for AI technology, yet Corporate AI has set a precedent for developing AI in ways that are extractive, environmentally harmful, and colonialist. 

  {% for note in collections["corporate-ai"] %}
    {% include "notes-by-tag-list.njk" %}
  {% else %}
    <p>No notes found.</p>
  {% endfor %}

## Ways Forward
Our visions for other ways are not meant to be perfectly fitting solutions for the critiques and problems outlined above. Instead they are speculative, yet possible, visions for other ways to be in relationship to technology. 

  {% for note in collections["ways-forward"] %}
    {% include "notes-by-tag-list.njk" %}
  {% else %}
    <p>No notes found.</p>
  {% endfor %}