_context.invoke('Nittro.Page', function (Helpers, Snippet, DOM, Arrays, undefined) {

    var SnippetManager = _context.extend('Nittro.Object', function() {
        SnippetManager.Super.call(this);

        this._.snippets = {};
        this._.containerCache = null;
        this._.currentPhase = Snippet.INACTIVE;

    }, {
        getSnippet: function (id) {
            if (!this._.snippets[id]) {
                this._.snippets[id] = new Snippet(id, this._.currentPhase);

            }

            return this._.snippets[id];

        },

        isSnippet: function (elem) {
            return (typeof elem === 'string' ? elem : elem.id) in this._.snippets;

        },

        setup: function() {
            this._runSnippetsPhase(this._.snippets, Snippet.PREPARE_SETUP);
            this._runSnippetsPhase(this._.snippets, Snippet.RUN_SETUP);
        },

        getRemoveTargets: function (elem) {
            var sel = DOM.getData(elem, 'dynamic-remove');
            return sel ? DOM.find(sel) : [];

        },

        computeChanges: function (snippets, removeTargets) {
            this._clearDynamicContainerCache();

            var changeset = {
                remove: {},
                update: {},
                add: {},
                containers: {}
            };

            this._resolveRemovals(removeTargets, changeset);
            this._resolveUpdates(snippets, changeset);
            this._resolveDynamicSnippets(changeset);

            return changeset;

        },

        applyChanges: function (changeset) {
            var teardown = Arrays.mergeTree({}, changeset.remove, changeset.update),
                setup = Arrays.mergeTree({}, changeset.update, changeset.add);

            this._runSnippetsPhase(teardown, Snippet.PREPARE_TEARDOWN);
            this._runSnippetsPhase(teardown, Snippet.RUN_TEARDOWN);
            this._runSnippetsPhase(teardown, Snippet.INACTIVE);

            this.trigger('before-update', changeset);

            this._applyRemove(changeset.remove);
            this._applyUpdate(changeset.update);
            this._applyAdd(changeset.add, changeset.containers);
            this._applyDynamic(changeset.containers, setup);

            return this._runSnippetsPhaseOnNextFrame(setup, Snippet.PREPARE_SETUP)
                .then(function () {
                    this._runSnippetsPhase(setup, Snippet.RUN_SETUP);

                }.bind(this));
        },

        _resolveRemovals: function(removeTargets, changeset) {
            removeTargets.forEach(function(elem) {
                changeset.remove[elem.id] = {
                    element: elem
                };

                this._cleanupSnippet(elem, changeset);

            }.bind(this));
        },

        _resolveUpdates: function(snippets, changeset) {
            var id, elem;

            for (id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    elem = DOM.getById(id);

                    if (elem) {
                        this._cleanupSnippet(elem, changeset);

                        if (id in changeset.remove) {
                            changeset.add[id] = this._resolveAddition(id, snippets[id]);

                        } else {
                            changeset.update[id] = this._resolveUpdate(elem, snippets[id]);

                        }
                    } else {
                        changeset.add[id] = this._resolveAddition(id, snippets[id]);

                    }
                }
            }
        },

        _resolveDynamicSnippets: function(changeset) {
            var id, type, cid, params;

            for (type in {update: 1, add: 1}) {
                for (id in changeset[type]) {
                    if (changeset[type].hasOwnProperty(id) && (cid = changeset[type][id].container)) {
                        params = this._getDynamicContainerParams(cid);

                        if (params.sort !== 'prepend' && params.sort !== 'append') {
                            changeset.containers[cid] || (changeset.containers[cid] = {});
                            changeset.containers[cid][id] = changeset[type][id];

                        } else {
                            changeset[type][id].action = params.sort;

                        }
                    }
                }
            }

            for (cid in changeset.containers) {
                if (changeset.containers.hasOwnProperty(cid)) {
                    changeset.containers[cid] = Helpers.computeSortedSnippets(this.getSnippet(cid), changeset.containers[cid], changeset);

                }
            }
        },

        _resolveUpdate: function(elem, content) {
            return {
                element: elem,
                content: Helpers.buildContent(elem.tagName, content),
                container: DOM.hasClass(elem.parentNode, 'nittro-snippet-container') ? elem.parentNode.id : null
            };
        },

        _resolveAddition: function(id, content) {
            var params = this._getDynamicContainerParamsForId(id),
                elem = Helpers.buildContent(params.element, content);

            elem.id = id;

            return {
                content: elem,
                container: params.id
            };
        },

        _cleanupSnippet: function(elem, changeset) {
            var id, snippet;

            for (id in this._.snippets) {
                if (this._.snippets.hasOwnProperty(id) && !(id in changeset.remove)) {
                    snippet = this._.snippets[id].getElement();

                    if (snippet !== elem && DOM.contains(elem, snippet)) {
                        changeset.remove[id] = {
                            element: snippet,
                            isDescendant: true
                        };
                    }
                }
            }
        },

        _runSnippetsPhase: function (snippets, phase) {
            this._.currentPhase = phase;

            for (var id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    this.getSnippet(id).runPhase(phase);

                }
            }
        },

        _runSnippetsPhaseOnNextFrame: function(snippets, phase) {
            return new Promise(function(fulfill) {
                window.requestAnimationFrame(function() {
                    this._runSnippetsPhase(snippets, phase);
                    fulfill();

                }.bind(this));
            }.bind(this));
        },

        _applyRemove: function(snippets) {
            for (var id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    if (!snippets[id].isDescendant) {
                        snippets[id].element.parentNode.removeChild(snippets[id].element);

                    }

                    if (id in this._.snippets) {
                        delete this._.snippets[id];

                    }
                }
            }
        },

        _applyUpdate: function(snippets) {
            for (var id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    DOM.empty(snippets[id].element);
                    DOM.append(snippets[id].element, Arrays.createFrom(snippets[id].content.childNodes));

                }
            }
        },

        _applyAdd: function(snippets, containers) {
            for (var id in snippets) {
                if (snippets.hasOwnProperty(id) && !(snippets[id].container in containers)) {
                    if (snippets[id].action === 'prepend') {
                        DOM.prepend(snippets[id].container, snippets[id].content);

                    } else {
                        DOM.append(snippets[id].container, snippets[id].content);

                    }
                }
            }
        },

        _applyDynamic: function(containers, snippets) {
            for (var cid in containers) {
                if (containers.hasOwnProperty(cid)) {
                    Helpers.applySortedSnippets(this.getSnippet(cid).getElement(), containers[cid], snippets);

                }
            }
        },

        _getDynamicContainerCache: function () {
            if (this._.containerCache === null) {
                this._.containerCache = DOM.getByClassName('nittro-snippet-container')
                    .map(function (elem) {
                        return elem.id;
                    });
            }

            return this._.containerCache;

        },

        _clearDynamicContainerCache: function () {
            this._.containerCache = null;

        },

        _getDynamicContainerParams: function (id) {
            var container = this.getSnippet(id);

            if (!container.isContainer()) {
                return Helpers.prepareDynamicContainer(container);

            } else {
                return container.getData('_snippet_container');

            }
        },

        _getDynamicContainerParamsForId: function (id) {
            var cache = this._getDynamicContainerCache(),
                i, n, params;

            for (i = 0, n = cache.length; i < n; i++) {
                params = this._getDynamicContainerParams(cache[i]);

                if (params.mask.test(id)) {
                    return params;

                }
            }

            throw new Error('Dynamic snippet #' + id + ' has no container');

        }
    });

    _context.register(SnippetManager, 'SnippetManager');

}, {
    Helpers: 'Nittro.Page.SnippetManagerHelpers',
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays'
});
