---
title: All Notes
layout: base.njk
---

# All Notes

<div class="notes-grid">
{% for note in collections.all | getNotes %}
    <article class="note-card">
        <h3><a href="{{ note.url }}">{{ note.data.title | default(note.fileSlug) }}</a></h3>
        {% if note.data.description %}
        <p>{{ note.data.description }}</p>
        {% endif %}
        <div class="note-meta">
            {% set backlinks = collections.all | getBacklinks(note) %}
            {% if backlinks.length > 0 %}
            <span class="backlink-count">{{ backlinks.length }} backlinks</span>
            {% endif %}
        </div>
    </article>
{% endfor %}
</div>
