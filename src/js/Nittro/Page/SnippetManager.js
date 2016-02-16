_context.invoke('Nittro.Page', function (Snippet, DOM) {

    var SnippetManager = _context.extend(function (reportPhase) {
        this._ = {
            snippets: {},
            currentPhase: Snippet.INACTIVE,
            formLocator: null,
            reportPhase: reportPhase
        };
    }, {
        setFormLocator: function (formLocator) {
            this._.formLocator = formLocator;
            return this;

        },

        getSnippet: function (id) {
            if (!this._.snippets[id]) {
                this._.snippets[id] = new Snippet(id, this._.currentPhase);

            }

            return this._.snippets[id];

        },

        isSnippet: function (elem) {
            return (typeof elem === 'string' ? elem : elem.id) in this._.snippets;

        },

        applySnippets: function (snippets, removeTarget) {
            var setup = {},
                teardown = {},
                dynamic = [];

            if (removeTarget) {
                this._cleanupChildSnippets(removeTarget, teardown);
                this._cleanupForms(removeTarget);

                if (this.isSnippet(removeTarget)) {
                    teardown[removeTarget.id] = true;

                }
            }

            this._prepareSnippets(snippets, setup, teardown, dynamic);
            this._teardown(teardown);

            if (removeTarget) {
                removeTarget.parentNode.removeChild(removeTarget);
                removeTarget = null;

            }

            this._setupDynamic(dynamic, snippets);
            this._setup(setup, snippets);

            return dynamic;

        },

        setup: function () {
            this._setup();
            return this;

        },

        _cleanupChildSnippets: function (elem, teardown) {
            for (var i in this._.snippets) {
                if (this._.snippets.hasOwnProperty(i) && this._.snippets[i].getState() === Snippet.RUN_SETUP && this._.snippets[i].getElement() !== elem && DOM.contains(elem, this._.snippets[i].getElement())) {
                    teardown[i] = true;

                }
            }
        },

        _cleanupForms: function (snippet) {
            if (!this._.formLocator) {
                return;

            }

            if (snippet.tagName.toLowerCase() === 'form') {
                this._.formLocator.removeForm(snippet);

            } else {
                var forms = snippet.getElementsByTagName('form'),
                    i;

                for (i = 0; i < forms.length; i++) {
                    this._.formLocator.removeForm(forms.item(i));

                }
            }
        },

        _prepareSnippets: function (snippets, setup, teardown, dynamic) {
            for (var id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    this._prepareSnippet(id, setup, teardown, dynamic);

                }
            }
        },

        _prepareSnippet: function (id, setup, teardown, dynamic) {
            if (this._.snippets[id] && this._.snippets[id].getState() === Snippet.RUN_SETUP) {
                teardown[id] = false;

            }

            var snippet = DOM.getById(id);

            if (snippet) {
                this._cleanupChildSnippets(snippet, teardown);
                this._cleanupForms(snippet);

                setup[id] = true;

                if (this._isDynamic(snippet, id)) {
                    dynamic.push([id, snippet, false]);

                }
            } else {
                dynamic.push([id, null, false]);

            }
        },

        _teardown: function (snippets) {
            this._setSnippetsState(snippets, Snippet.PREPARE_TEARDOWN);
            this._setSnippetsState(snippets, Snippet.RUN_TEARDOWN);
            this._setSnippetsState(snippets, Snippet.INACTIVE);

            this._.reportPhase('teardown');

            for (var id in snippets) {
                if (snippets.hasOwnProperty(id) && snippets[id]) {
                    delete this._.snippets[id];

                }
            }
        },

        _setupDynamic: function (snippets, data) {
            snippets.forEach(function (snippet) {
                if (snippet[1] === null) {
                    snippet[1] = this._insertDynamic(snippet[0], data[snippet[0]]);
                    snippet[2] = true;

                }
            }.bind(this));
        },

        _setup: function (snippets, data) {
            if (data) {
                for (var id in snippets) {
                    if (snippets.hasOwnProperty(id)) {
                        DOM.html(id, data[id] || '');

                    }
                }
            }

            this._.reportPhase('setup');

            this._setSnippetsState(this._.snippets, Snippet.PREPARE_SETUP);
            this._setSnippetsState(this._.snippets, Snippet.RUN_SETUP);

        },

        _setSnippetsState: function (snippets, state) {
            this._.currentPhase = state;

            for (var id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    this.getSnippet(id).setState(state);

                }
            }
        },

        _isDynamic: function (elem, id) {
            if (!elem.parentNode || !DOM.hasClass(elem.parentNode, 'snippet-container')) {
                return false;

            }

            return !!id.match(new RegExp('^' + DOM.getData(elem.parentNode, 'dynamicMask') + '$'));

        },

        _insertDynamic: function (id, data) {
            var container = null;

            DOM.getByClassName('snippet-container').some(function (elem) {
                var pattern = new RegExp('^' + DOM.getData(elem, 'dynamicMask') + '$');

                if (pattern.test(id)) {
                    container = elem;
                    return true;

                }
            });

            if (!container) {
                throw new Error('No container found for dynamic snippet ID #' + id);

            }

            var elem = (DOM.getData(container, 'dynamicElement') || 'div').split(/\./g),
                insertMode = DOM.getData(container, 'dynamicInsertMode') || 'append';

            elem[0] = DOM.create(elem[0], {
                id: id
            });

            if (elem.length > 1) {
                DOM.addClass.apply(null, elem);

            }

            elem = elem[0];
            DOM.html(elem, data);

            switch (insertMode) {
                case 'append':
                    container.appendChild(elem);
                    break;

                case 'prepend':
                    if (container.hasChildNodes()) {
                        container.insertBefore(elem, container.firstChild);

                    } else {
                        container.appendChild(elem);

                    }
                    break;

                default:
                    if (insertMode.match(/^sorted:/i)) {
                        this._insertSortedSnippet(container, elem, insertMode.substr(7));

                    } else {
                        throw new TypeError('Invalid insert mode for dynamic snippet container ' + container.getAttribute('id'));

                    }
                    break;
            }

            return elem;

        },

        _insertSortedSnippet: function(container, snippet, descriptor) {
            var search = [], children = DOM.getChildren(container),
                x, d, s, a, o, e, val, i, c = 0, n = children.length, f;

            if (!n) {
                container.appendChild(snippet);
                return;

            }

            val = function(e, s, a, d) {
                var n = e.getElementsByClassName(s);

                if (!n.length) {
                    return null;

                } else if (a) {
                    return n[0].getAttribute(a);

                } else if (d) {
                    return DOM.getData(n[0], d);

                } else {
                    return n[0].textContent;

                }
            };

            descriptor = descriptor.trim().split(/\s*;\s*/);

            while (descriptor.length) {
                x = descriptor.shift();

                if (s = x.match(/^(.+?)(?:\[(.+?)\])?(?:<(.+?)>)?(?:\s+(.+?))?$/i)) {
                    o = s[4] || null;
                    d = s[3] || null;
                    a = s[2] || null;
                    s = s[1];

                    if (s.match(/^[^.]|[\s#\[>+:]/)) {
                        throw new TypeError('Invalid selector for sorted insert mode in container #' + container.getAttribute('id'));

                    }

                    search.push({
                        sel: s.substr(1),
                        attr: a,
                        data: d,
                        asc: o ? o.match(/^[1tay]/i) : true,
                        value: val(snippet, s.substr(1), a, d)
                    });
                }
            }

            for (s = 0; s < search.length; s++) {
                x = search[s];
                f = false;

                for (i = c; i < n; i++) {
                    e = children[i];
                    d = val(e, x.sel, x.attr, x.data);

                    if (x.asc) {
                        if (x.value > d) {
                            c = i;

                        } else if (x.value < d) {
                            n = i;
                            break;

                        } else if (!f) {
                            c = i;
                            f = true;

                        }
                    } else {
                        if (x.value < d) {
                            c = i;

                        } else if (x.value > d) {
                            n = i;
                            break;

                        } else if (!f) {
                            c = i;
                            f = true;

                        }
                    }
                }

                if (n === c) {
                    container.insertBefore(snippet, children[n]);
                    return;

                } else if (n === c + 1 && !f) {
                    if (c >= children.length - 1) {
                        container.appendChild(snippet);

                    } else {
                        container.insertBefore(snippet, children[c + 1]);

                    }
                    return;

                }
            }

            if (x.asc) {
                if (n >= children.length) {
                    container.appendChild(snippet);

                } else {
                    container.insertBefore(snippet, children[n]);

                }
            } else {
                container.insertBefore(snippet, children[c]);

            }
        }
    });

    _context.register(SnippetManager, 'SnippetManager');

}, {
    DOM: 'Utils.DOM'
});
