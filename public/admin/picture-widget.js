/* "Picture" field for the writing desk (Decap CMS).
 * Lets the author pick a picture for a poem or page by:
 *   - searching free photo sites (Pexels, Pixabay, Openverse: Wikimedia Commons, Flickr…),
 *     with search ideas taken from the poem by AI,
 *   - creating one with AI (limited by a monthly budget),
 *   - or uploading their own.
 * The chosen picture is cropped to 1280×720 and saved to the site; the field stores its path.
 * Uses the globals Decap provides: CMS, createClass and h. */
(function () {
  'use strict';

  function token() {
    try {
      return JSON.parse(localStorage.getItem('decap-cms-user') || '{}').token || '';
    } catch (e) {
      return '';
    }
  }

  function api(path, body) {
    return fetch('/api/images/' + path + '/', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-github-token': token() },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (data) {
          if (!res.ok) throw new Error(data.error || 'Something went wrong (' + res.status + ').');
          return data;
        });
    });
  }

  // Shrink large photos in the browser before upload (keeps requests small).
  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var max = 2400;
        var scale = Math.min(1, max / Math.max(img.width, img.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(img.src);
        resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
      };
      img.onerror = function () {
        reject(new Error('That file could not be read as a picture.'));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  function cents(c) {
    return '$' + (Number(c || 0) / 100).toFixed(2);
  }

  var S = {
    wrap: { display: 'flex', flexDirection: 'column', gap: '12px' },
    row: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' },
    btn: {
      padding: '8px 14px',
      borderRadius: '6px',
      border: '1px solid #c9c0b5',
      background: '#fff',
      cursor: 'pointer',
      fontSize: '14px',
    },
    primary: {
      padding: '8px 14px',
      borderRadius: '6px',
      border: '1px solid #741630',
      background: '#741630',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 600,
    },
    current: { width: '100%', maxWidth: '480px', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: '8px', background: '#eee' },
    panel: { border: '1px solid #dfd8ce', borderRadius: '10px', padding: '14px', background: '#faf7f2' },
    tabs: { display: 'flex', gap: '6px', marginBottom: '12px' },
    tab: function (on) {
      return {
        padding: '6px 12px',
        borderRadius: '999px',
        border: '1px solid ' + (on ? '#26221e' : '#c9c0b5'),
        background: on ? '#26221e' : '#fff',
        color: on ? '#fff' : '#26221e',
        cursor: 'pointer',
        fontSize: '13px',
      };
    },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginTop: '10px' },
    card: { background: '#fff', border: '1px solid #e6dfd5', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    thumb: { width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', display: 'block', background: '#eee' },
    meta: { padding: '6px 8px', fontSize: '11px', color: '#5f574f', lineHeight: 1.35, flex: 1 },
    use: { margin: '0 8px 8px', padding: '6px', borderRadius: '6px', border: '1px solid #741630', background: '#fff', color: '#741630', cursor: 'pointer', fontSize: '13px', fontWeight: 600 },
    chip: { padding: '4px 10px', borderRadius: '999px', border: '1px solid #c9c0b5', background: '#fff', cursor: 'pointer', fontSize: '12px' },
    input: { flex: '1 1 200px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #c9c0b5', fontSize: '14px' },
    textarea: { width: '100%', minHeight: '70px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #c9c0b5', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' },
    note: { fontSize: '12px', color: '#8a8178' },
    error: { fontSize: '13px', color: '#741630', fontWeight: 600 },
  };

  var PictureControl = createClass({
    getInitialState: function () {
      return {
        open: false,
        tab: 'free',
        loading: false,
        saving: '',
        error: '',
        query: '',
        queries: [],
        results: [],
        sources: {},
        prompt: '',
        aiImages: [],
        budget: null,
        preview: '',
        credit: null,
        searched: false,
      };
    },

    // Decap only re-renders a field when its own value changes, so props.entry can be
    // stale. Read the live title and text from the editor, falling back to the entry.
    entryText: function () {
      var entry = this.props.entry;
      var saved = function (k) {
        var v = entry && entry.getIn(['data', k]);
        return v == null ? '' : String(v);
      };
      var live = function (name) {
        var input = document.querySelector('[id^="' + name + '-field"]');
        if (input && typeof input.value === 'string') return input.value;
        // Rich-text fields have no input with that id: find the editor next to the label,
        // walking up only while the container holds this one field.
        var label = document.querySelector('label[for^="' + name + '-field"]');
        var editor = null;
        for (var box = label && label.parentElement, i = 0; box && i < 4 && !editor; box = box.parentElement, i++) {
          if (box.querySelectorAll('label').length > 1) break;
          editor = box.querySelector('textarea, [contenteditable="true"]');
        }
        if (!editor) return '';
        return typeof editor.value === 'string' ? editor.value : editor.innerText || '';
      };
      return { title: live('title') || saved('title'), body: live('body') || saved('body') };
    },

    suggest: function (query) {
      var self = this;
      var t = this.entryText();
      if (!query && !t.title && !t.body) {
        this.setState({ error: 'Write the title and some text first, or type what to search for.' });
        return;
      }
      this.setState({ loading: true, error: '', searched: true });
      api('suggest', { title: t.title, body: t.body, query: query || '' })
        .then(function (d) {
          self.setState({
            loading: false,
            results: d.results || [],
            sources: d.sources || {},
            queries: query ? self.state.queries : d.queries || [],
            prompt: self.state.prompt || d.prompt || '',
            budget: d.budget || null,
            query: query || '',
          });
        })
        .catch(function (e) {
          self.setState({ loading: false, error: e.message });
        });
    },

    open: function () {
      this.setState({ open: !this.state.open });
      if (!this.state.searched) this.suggest('');
    },

    save: function (body, label) {
      var self = this;
      this.setState({ saving: label, error: '' });
      body.title = this.entryText().title || 'picture';
      api('save', body)
        .then(function (d) {
          self.setState({ saving: '', preview: d.preview, credit: d.credit, open: false });
          self.props.onChange(d.path);
        })
        .catch(function (e) {
          self.setState({ saving: '', error: e.message });
        });
    },

    useFound: function (r) {
      this.save(
        {
          kind: 'found',
          url: r.full,
          sig: r.sig,
          credit: { credit: r.credit, creditUrl: r.creditUrl, source: r.source, license: r.license, licenseUrl: r.licenseUrl, pageUrl: r.pageUrl },
        },
        r.id,
      );
    },

    create: function () {
      var self = this;
      this.setState({ loading: true, error: '', aiImages: [] });
      api('create', { prompt: this.state.prompt, count: 2 })
        .then(function (d) {
          self.setState({ loading: false, aiImages: d.images || [], budget: Object.assign({}, self.state.budget, d.budget, { available: true }) });
        })
        .catch(function (e) {
          self.setState({ loading: false, error: e.message });
        });
    },

    upload: function (e) {
      var self = this;
      var file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      this.setState({ saving: 'upload', error: '' });
      fileToBase64(file)
        .then(function (data) {
          self.save({ kind: 'upload', data: data }, 'upload');
        })
        .catch(function (err) {
          self.setState({ saving: '', error: err.message });
        });
    },

    renderFree: function () {
      var self = this;
      var st = this.state;
      var sourceNotes = Object.keys(st.sources)
        .filter(function (k) {
          return st.sources[k] !== 'ok';
        })
        .map(function (k) {
          return k + ': ' + st.sources[k];
        })
        .join(' · ');
      return h(
        'div',
        null,
        h(
          'form',
          {
            style: S.row,
            onSubmit: function (e) {
              e.preventDefault();
              if (st.query.trim()) self.suggest(st.query.trim());
            },
          },
          h('input', {
            style: S.input,
            placeholder: 'Search for… (e.g. moon over mountains)',
            value: st.query,
            onChange: function (e) {
              self.setState({ query: e.target.value });
            },
          }),
          h('button', { type: 'submit', style: S.btn, disabled: st.loading }, 'Search'),
          h('button', { type: 'button', style: S.btn, disabled: st.loading, onClick: function () { self.suggest(''); } }, '✨ Ideas from the poem'),
        ),
        st.queries.length
          ? h(
              'div',
              { style: Object.assign({}, S.row, { marginTop: '8px' }) },
              h('span', { style: S.note }, 'Ideas:'),
              st.queries.map(function (q) {
                return h('button', { key: q, type: 'button', style: S.chip, onClick: function () { self.suggest(q); } }, q);
              }),
            )
          : null,
        st.loading ? h('p', { style: S.note }, 'Looking for pictures…') : null,
        !st.loading && st.searched && !st.results.length ? h('p', { style: S.note }, 'No pictures found. Try different words.') : null,
        h(
          'div',
          { style: S.grid },
          st.results.map(function (r) {
            return h(
              'div',
              { key: r.id, style: S.card },
              h('a', { href: r.pageUrl || r.full, target: '_blank', rel: 'noopener' }, h('img', { src: r.thumb, alt: '', loading: 'lazy', style: S.thumb })),
              h('div', { style: S.meta }, r.credit + ' · ' + r.source, h('br'), r.license),
              h(
                'button',
                { type: 'button', style: S.use, disabled: !!st.saving, onClick: function () { self.useFound(r); } },
                st.saving === r.id ? 'Saving…' : 'Use this',
              ),
            );
          }),
        ),
        sourceNotes ? h('p', { style: Object.assign({}, S.note, { marginTop: '8px' }) }, sourceNotes) : null,
      );
    },

    renderAi: function () {
      var self = this;
      var st = this.state;
      var b = st.budget;
      return h(
        'div',
        null,
        h('p', { style: S.note }, 'Describe the picture. A painterly, muted style is added automatically.'),
        h('textarea', {
          style: S.textarea,
          value: st.prompt,
          placeholder: 'e.g. A lone figure on a hill watching the moon rise over a refugee camp',
          onChange: function (e) {
            self.setState({ prompt: e.target.value });
          },
        }),
        h(
          'div',
          { style: Object.assign({}, S.row, { marginTop: '8px' }) },
          h('button', { type: 'button', style: S.primary, disabled: st.loading || !st.prompt.trim(), onClick: this.create }, st.loading ? 'Creating…' : 'Create 2 pictures'),
          b && b.available !== false
            ? h('span', { style: S.note }, 'About 2¢. Left this month: ' + cents(b.remainingCents) + ' of ' + cents(b.limitCents))
            : null,
        ),
        h(
          'div',
          { style: S.grid },
          st.aiImages.map(function (img, i) {
            return h(
              'div',
              { key: i, style: S.card },
              h('img', { src: 'data:image/jpeg;base64,' + img.data, alt: '', style: S.thumb }),
              h(
                'button',
                { type: 'button', style: S.use, disabled: !!st.saving, onClick: function () { self.save({ kind: 'ai', data: img.data }, 'ai' + i); } },
                st.saving === 'ai' + i ? 'Saving…' : 'Use this',
              ),
            );
          }),
        ),
      );
    },

    render: function () {
      var self = this;
      var st = this.state;
      var value = this.props.value || '';
      var src = st.preview || (value ? (value.indexOf('http') === 0 ? value : window.location.origin + value) : '');
      return h(
        'div',
        { id: this.props.forID, className: this.props.classNameWrapper, style: Object.assign({}, S.wrap, { padding: '12px' }) },
        src ? h('img', { src: src, alt: '', style: S.current }) : h('p', { style: S.note }, 'No picture yet.'),
        st.credit && st.credit.credit ? h('p', { style: S.note }, 'Credit: ' + st.credit.credit + (st.credit.source ? ' · ' + st.credit.source : '')) : null,
        h(
          'div',
          { style: S.row },
          h('button', { type: 'button', style: S.primary, onClick: this.open }, st.open ? 'Close' : '✨ Suggest pictures'),
          h(
            'label',
            { style: S.btn },
            st.saving === 'upload' ? 'Uploading…' : 'Upload my own',
            h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: this.upload }),
          ),
          value
            ? h(
                'button',
                {
                  type: 'button',
                  style: S.btn,
                  onClick: function () {
                    self.setState({ preview: '', credit: null });
                    self.props.onChange('');
                  },
                },
                'Remove',
              )
            : null,
        ),
        st.error ? h('p', { style: S.error }, st.error) : null,
        st.open
          ? h(
              'div',
              { style: S.panel },
              h(
                'div',
                { style: S.tabs },
                h('button', { type: 'button', style: S.tab(st.tab === 'free'), onClick: function () { self.setState({ tab: 'free' }); } }, 'Free photos'),
                h('button', { type: 'button', style: S.tab(st.tab === 'ai'), onClick: function () { self.setState({ tab: 'ai' }); } }, 'Create with AI'),
              ),
              st.tab === 'free' ? this.renderFree() : this.renderAi(),
            )
          : null,
        h('p', { style: S.note }, 'The picture is saved to the site straight away and appears on the poem after you publish. Free photos are credited under the picture.'),
      );
    },
  });

  var PicturePreview = createClass({
    render: function () {
      var v = this.props.value;
      return v ? h('img', { src: v, alt: '', style: { maxWidth: '100%', borderRadius: '8px' } }) : null;
    },
  });

  CMS.registerWidget('picture', PictureControl, PicturePreview);
})();
