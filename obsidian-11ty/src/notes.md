---
title: All Notes
layout: base.njk
---

# All Notes

<div class="notes-grid">
{% for note in collections.notes %}
    <article class="note-card">
        <h3><a href="{{ note.url }}">{{ note.data.title | default(note.fileSlug) }}</a></h3>
        {% if note.data.description %}
        <p>{{ note.data.description }}</p>
        {% endif %}
    </article>
{% else %}
    <p>No notes found.</p>
{% endfor %}
</div>
