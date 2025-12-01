---
title: All Notes
layout: base.njk
---

# All Notes

<ul class="notes-list">
{% for note in collections.notes %}
    <li class="notes-entry">
        <a href="{{ note.url }}">{{ note.data.title | default(note.fileSlug) }}</a>
        {% if note.data.description %}
        - {{ note.data.description }}
        {% endif %}
    </li>
{% else %}
    <li>No notes found.</li>
{% endfor %}
</ul>
