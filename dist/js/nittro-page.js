_context.invoke('Nittro.Page', function (DOM, undefined) {

    var Snippet = _context.extend(function (id, phase) {
        this._ = {
            id: id,
            container: false,
            phase: typeof phase === 'number' ? phase : Snippet.INACTIVE,
            data: {},
            handlers: [
                [], [], [], []
            ]
        };
    }, {
        STATIC: {
            INACTIVE: -1,
            PREPARE_SETUP: 0,
            RUN_SETUP: 1,
            PREPARE_TEARDOWN: 2,
            RUN_TEARDOWN: 3
        },

        getId: function () {
            return this._.id;

        },

        setup: function (prepare, run) {
            if (prepare && !run) {
                run = prepare;
                prepare = null;

            }

            if (prepare) {
                if (this._.phase === Snippet.PREPARE_SETUP) {
                    prepare(this.getElement());

                } else {
                    this._.handlers[Snippet.PREPARE_SETUP].push(prepare);

                }
            }

            if (run) {
                if (this._.phase === Snippet.RUN_SETUP) {
                    run(this.getElement());

                } else {
                    this._.handlers[Snippet.RUN_SETUP].push(run);

                }
            }

            return this;

        },

        teardown: function (prepare, run) {
            if (prepare && !run) {
                run = prepare;
                prepare = null;

            }

            if (prepare) {
                if (this._.phase === Snippet.PREPARE_TEARDOWN) {
                    prepare(this.getElement());

                } else {
                    this._.handlers[Snippet.PREPARE_TEARDOWN].push(prepare);

                }
            }

            if (run) {
                if (this._.phase === Snippet.RUN_TEARDOWN) {
                    run(this.getElement());

                } else {
                    this._.handlers[Snippet.RUN_TEARDOWN].push(run);

                }
            }

            return this;

        },

        runPhase: function (phase) {
            if (phase === Snippet.INACTIVE) {
                this._.phase = phase;

                this._.handlers.forEach(function (queue) {
                    queue.splice(0, queue.length);

                });

            } else if (phase - 1 === this._.phase) {
                this._.phase = phase;

                var elm = this.getElement();

                this._.handlers[this._.phase].forEach(function (handler) {
                    handler(elm);

                });

                this._.handlers[this._.phase].splice(0, this._.handlers[this._.phase].length);

            }

            return this;

        },

        getPhase: function () {
            return this._.phase;

        },

        getData: function (key, def) {
            return key in this._.data ? this._.data[key] : (def === undefined ? null : def);

        },

        setData: function (key, value) {
            this._.data[key] = value;
            return this;

        },

        setContainer: function () {
            this._.container = true;
            return this;

        },

        isContainer: function () {
            return this._.container;

        },

        getElement: function () {
            return DOM.getById(this._.id);

        }
    });

    _context.register(Snippet, 'Snippet');

}, {
    DOM: 'Utils.DOM'
});
;
_context.invoke('Nittro.Page', function(DOM) {

    var Helpers = {
        buildContent: function(elem, html) {
            elem = elem.split(/\./g);
            elem[0] = DOM.create(elem[0]);

            if (elem.length > 1) {
                DOM.addClass.apply(DOM, elem);
            }

            elem = elem[0];
            DOM.html(elem, html);

            return elem;

        },

        prepareDynamicContainer: function (snippet) {
            var elem = snippet.getElement(),
                params = {
                    id: snippet.getId(),
                    mask: new RegExp('^' + DOM.getData(elem, 'dynamic-mask') + '$'),
                    element: DOM.getData(elem, 'dynamic-element') || 'div',
                    sort: DOM.getData(elem, 'dynamic-sort') || 'append',
                    sortCache: DOM.getData(elem, 'dynamic-sort-cache') === false ? false : null
                };

            snippet.setContainer();
            snippet.setData('_snippet_container', params);
            return params;

        },

        computeSortedSnippets: function (container, snippets, changeset) {
            var sortData = Helpers._getSortData(container.getData('_snippet_container'), container.getElement(), changeset);
            Helpers._mergeSortData(sortData, snippets);
            return Helpers._applySortData(sortData);
        },

        applySortedSnippets: function (container, ids, snippets) {
            var i = 0, n = ids.length, tmp;

            tmp = container.firstElementChild;

            while (i < n && ids[i] in snippets && !snippets[ids[i]].element) {
                container.insertBefore(snippets[ids[i]].content, tmp);
                i++;

            }

            while (n > i && ids[n - 1] in snippets && !snippets[ids[n - 1]].element) {
                n--;

            }

            for (; i < n; i++) {
                if (ids[i] in snippets) {
                    if (snippets[ids[i]].element) {
                        if (snippets[ids[i]].element.previousElementSibling !== (i > 0 ? DOM.getById(ids[i - 1]) : null)) {
                            container.insertBefore(snippets[ids[i]].element, i > 0 ? DOM.getById(ids[i - 1]).nextElementSibling : container.firstElementChild);

                        }
                    } else {
                        container.insertBefore(snippets[ids[i]].content, DOM.getById(ids[i - 1]).nextElementSibling);

                    }
                }
            }

            while (n < ids.length) {
                container.appendChild(snippets[ids[n]].content);
                n++;

            }
        },

        _applySortData: function (sortData) {
            var sorted = [],
                id;

            for (id in sortData.snippets) {
                if (sortData.snippets.hasOwnProperty(id)) {
                    sorted.push({id: id, values: sortData.snippets[id]});

                }
            }

            sorted.sort(Helpers._compareSnippets.bind(null, sortData.descriptor));
            return sorted.map(function(snippet) { return snippet.id; });

        },

        _compareSnippets: function (descriptor, a, b) {
            var i, n, v;

            for (i = 0, n = descriptor.length; i < n; i++) {
                v = a.values[i] < b.values[i] ? -1 : (a.values[i] > b.values[i] ? 1 : 0);

                if (v !== 0) {
                    return v * (descriptor[i].asc ? 1 : -1);

                }
            }

            return 0;

        },

        _getSortData: function (params, elem, changeset) {
            var sortData = params.sortCache;

            if (!sortData) {
                sortData = Helpers._buildSortData(params, elem, changeset);

                if (params.sortCache !== false) {
                    params.sortCache = sortData;

                }
            } else {
                for (var id in sortData.snippets) {
                    if (sortData.snippets.hasOwnProperty(id) && (id in changeset.remove || !DOM.getById(id))) {
                        delete sortData.snippets[id];

                    }
                }
            }

            return sortData;

        },

        _buildSortData: function (params, elem, changeset) {
            var sortData = {
                descriptor: params.sort.trim().split(/\s*,\s*/g).map(Helpers._parseDescriptor.bind(null, params.id)),
                snippets: {}
            };

            var children = {};

            DOM.getChildren(elem).forEach(function(child) {
                if (!(child.id in changeset.remove || child.id in changeset.update)) {
                    children[child.id] = {
                        content: child
                    };
                }
            });

            Helpers._mergeSortData(sortData, children);

            return sortData;

        },

        _mergeSortData: function (sortData, snippets) {
            for (var id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    sortData.snippets[id] = Helpers._extractSortData(snippets[id].content, sortData.descriptor);

                }
            }
        },

        _extractSortData: function (elem, descriptor) {
            return descriptor.map(function (field) {
                return field.extractor(elem);

            });
        },

        _parseDescriptor: function (id, descriptor) {
            var m = descriptor.match(/^(.+?)(?:\[(.+?)\])?(?:\((.+?)\))?(?:\s+(.+?))?$/),
                sel, attr, prop, asc;

            if (!m) {
                throw new Error('Invalid sort descriptor: ' + descriptor);

            }

            sel = m[1];
            attr = m[2];
            prop = m[3];
            asc = m[4];

            if (sel.match(/^[^.]|[\s#\[>+:]/)) {
                throw new TypeError('Invalid selector for sorted insert mode in container #' + id);

            }

            sel = sel.substr(1);
            asc = asc ? /^[1tay]/i.test(asc) : true;

            if (attr) {
                return {extractor: Helpers._getAttrExtractor(sel, attr), asc: asc};

            } else if (prop) {
                return {extractor: Helpers._getDataExtractor(sel, prop), asc: asc};

            } else {
                return {extractor: Helpers._getTextExtractor(sel), asc: asc};

            }
        },

        _getAttrExtractor: function (sel, attr) {
            return function (elem) {
                elem = elem.getElementsByClassName(sel);
                return elem.length ? elem[0].getAttribute(attr) || null : null;
            };
        },

        _getDataExtractor: function (sel, prop) {
            return function (elem) {
                elem = elem.getElementsByClassName(sel);
                return elem.length ? DOM.getData(elem[0], prop, null) : null;
            };
        },

        _getTextExtractor: function (sel) {
            return function (elem) {
                elem = elem.getElementsByClassName(sel);
                return elem.length ? elem[0].textContent : null;
            };
        }
    };

    _context.register(Helpers, 'SnippetManagerHelpers');

}, {
    DOM: 'Utils.DOM'
});
;
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
;
_context.invoke('Nittro.Page', function() {

    var SnippetAgent = _context.extend(function(snippetManager) {
        this._ = {
            snippetManager: snippetManager
        };
    }, {
        init: function(transaction, context) {
            return {
                removeTargets: context.element ? this._.snippetManager.getRemoveTargets(context.element) : []
            };
        },

        dispatch: function(transaction, data) {

        },

        abort: function(transaction, data) {
            // clean up remove targets
        },

        handleAction: function(transaction, agent, action, actionData, data) {
            if (agent === 'ajax' && action === 'response') {
                var payload = actionData.getPayload(),
                    changeset;

                if (payload.snippets || data.removeTargets.length) {
                    changeset = this._.snippetManager.computeChanges(payload.snippets || {}, data.removeTargets);

                    return transaction.dispatchAgentAction('snippets', 'apply-changes', changeset)
                        .then(function() {
                            this._.snippetManager.applyChanges(changeset);
                        }.bind(this));
                }
            }
        }
    });

    _context.register(SnippetAgent, 'SnippetAgent');

});
;
_context.invoke('Nittro.Page', function(Arrays, Url) {

    var AjaxAgent = _context.extend(function(ajax, options) {
        this._ = {
            ajax: ajax,
            options: Arrays.mergeTree({}, AjaxAgent.defaults, options)
        };

        if (!this._.options.allowOrigins) {
            this._.options.allowOrigins = [];
        } else if (!Array.isArray(this._.options.allowOrigins)) {
            this._.options.allowOrigins = this._.options.allowOrigins.split(/\s*,\s*/g);
        }

        this._.options.allowOrigins.push(Url.fromCurrent().getOrigin());

    }, {
        STATIC: {
            defaults: {
                whitelistRedirects: false,
                allowOrigins: null
            }
        },

        checkUrl: function(url, current) {
            if ((url + '').match(/^javascript:/)) {
                return false;
            }

            var u = url ? Url.from(url) : Url.fromCurrent(),
                c, d;

            if (this._.options.allowOrigins.indexOf(u.getOrigin()) === -1) {
                return false;
            }

            c = current ? Url.from(current) : Url.fromCurrent();
            d = u.compare(c);

            return d === 0 || d > Url.PART.HASH;

        },

        init: function(transaction, context) {
            return {
                request: this._.ajax.createRequest(transaction.getUrl(), context.method, context.data)
            };
        },

        dispatch: function(transaction, data) {
            return this._.ajax.dispatch(data.request)
                .then(this._handleResponse.bind(this, transaction, data));

        },

        abort: function(transaction, data) {
            data.request.abort();
        },

        handleAction: function(transaction, agent, action, actionData, data) {
            // may return promise
        },

        _handleResponse: function(transaction, data, response) {
            return transaction.dispatchAgentAction('ajax', 'response', response)
                .then(function() {
                    var payload = response.getPayload();

                    if (payload.postGet) {
                        transaction.setUrl(payload.url);
                    }

                    if ('redirect' in payload) {
                        if ((!this._.options.whitelistRedirects ? payload.allowAjax !== false : payload.allowAjax) && this.checkUrl(payload.redirect)) {
                            transaction.setUrl(payload.redirect);
                            data.request = this._.ajax.createRequest(payload.redirect);
                            return this.dispatch(transaction, data);

                        } else {
                            document.location.href = payload.redirect;

                        }
                    } else {
                        return data.request;

                    }
                }.bind(this));
        }
    });

    _context.register(AjaxAgent, 'AjaxAgent');

}, {
    Arrays: 'Utils.Arrays',
    Url: 'Utils.Url'
});
;
_context.invoke('Nittro.Page', function(Arrays, DOM, Url) {

    var HistoryAgent = _context.extend(function(options) {
        this._ = {
            options: Arrays.mergeTree({}, HistoryAgent.defaults, options)
        };
    }, {
        STATIC: {
            defaults: {
                whitelistHistory: false
            }
        },

        init: function (transaction, context) {
            if ('history' in context) {
                transaction.setIsHistoryState(context.history);

            } else if (context.element) {
                transaction.setIsHistoryState(this._.options.whitelistHistory ? DOM.hasClass(context.element, 'nittro-history') : !DOM.hasClass(context.element, 'nittro-no-history'));

            } else {
                transaction.setIsHistoryState(!this._.options.whitelistHistory);

            }

            return {
                title: document.title
            };
        },

        dispatch: function (transaction, data) {
            transaction.then(this._saveState.bind(this, transaction, data));
        },

        abort: function (transaction, data) {

        },

        handleAction: function (transaction, agent, action, actionData, data) {
            if (agent === 'ajax' && action === 'response') {
                var payload = actionData.getPayload();

                if (payload.title) {
                    data.title = payload.title;
                }
            }
        },

        _saveState: function (transaction, data) {
            if (transaction.getUrl().getOrigin() !== Url.fromCurrent().getOrigin()) {
                transaction.setIsHistoryState(false);

            } else if (transaction.isHistoryState()) {
                window.history.pushState({_nittro: true}, data.title, transaction.getUrl().toAbsolute());
                document.title = data.title;

            }
        }
    });

    _context.register(HistoryAgent, 'HistoryAgent');

}, {
    Arrays: 'Utils.Arrays',
    DOM: 'Utils.DOM',
    Url: 'Utils.Url'
});
;
_context.invoke('Nittro.Page', function (DOM) {

    var TransitionHelper = _context.extend(function() {
        this._ = {
            support: !!window.getComputedStyle
        };

        if (this._.support) try {
            var s = DOM.create('span').style;

            this._.support = [
                'transition',
                'WebkitTransition',
                'MozTransition',
                'msTransition',
                'OTransition'
            ].some(function(prop) {
                return prop in s;
            });

            s = null;

        } catch (e) { }

    }, {
        transition: function(elements, classes, forceLayout) {
            if (!this._.support || !elements.length) {
                return Promise.resolve(elements);

            } else {
                return this._resolve(elements, classes, forceLayout);

            }
        },

        _resolve: function (elements, classes, forceLayout) {
            if (forceLayout) {
                var foo = window.pageXOffset; // needed to force layout and thus run asynchronously

            }

            classes.add && DOM.addClass(elements, classes.add);
            classes.remove && DOM.removeClass(elements, classes.remove);

            var duration = this._getDuration(elements);

            return new Promise(function (fulfill) {
                window.setTimeout(function () {
                    classes.add && DOM.removeClass(elements, classes.add);
                    classes.after && DOM.addClass(elements, classes.after);
                    fulfill(elements);

                }.bind(this), duration);
            }.bind(this));
        },

        _getDuration: function (elements) {
            var durations = DOM.getStyle(elements, 'animationDuration')
                .concat(DOM.getStyle(elements, 'transitionDuration'))
                .map(function(d) {
                    if (!d) {
                        return 0;
                    }

                    return Math.max.apply(null, d.split(/\s*,\s*/g).map(function(v) {
                        v = v.match(/^((?:\d*\.)?\d+)(m?s)$/);
                        return v ? parseFloat(v[1]) * (v[2] === 'ms' ? 1 : 1000) : 0;

                    }));
                });

            return durations.length ? Math.max.apply(null, durations) : 0;

        }
    });

    _context.register(TransitionHelper, 'TransitionHelper');

}, {
    DOM: 'Utils.DOM'
});
;
_context.invoke('Nittro.Page', function (DOM, Arrays, undefined) {

    var TransitionAgent = _context.extend('Nittro.Object', function(transitionHelper, options) {
        TransitionAgent.Super.call(this);

        this._.transitionHelper = transitionHelper;
        this._.ready = true;
        this._.queue = [];
        this._.options = Arrays.mergeTree({}, TransitionAgent.defaults, options);

    }, {
        STATIC: {
            defaults: {
                defaultSelector: '.nittro-transition-auto'
            }
        },

        init: function(transaction, context) {
            return {
                elements: this._getTransitionTargets(context.element),
                removeTargets: context.element ? this._getRemoveTargets(context.element) : []
            };
        },

        dispatch: function(transaction, data) {
            transaction.then(this._transitionIn.bind(this, data, false), this._transitionIn.bind(this, data, true));

            if (data.elements.length || data.removeTargets.length) {
                return data.transitionOut = this._transitionOut(data);

            }
        },

        abort: function(transaction, data) {
            if (data.elements.length || data.removeTargets.length) {
                this._transitionIn(data, true);

            }
        },

        handleAction: function(transaction, agent, action, actionData, data) {
            if (agent === 'snippets' && action === 'apply-changes') {
                for (var id in actionData.add) {
                    if (actionData.add.hasOwnProperty(id)) {
                        DOM.addClass(actionData.add[id].content, 'nittro-dynamic-add', 'nittro-transition-middle');
                        data.elements.push(actionData.add[id].content);

                    }
                }

                return data.transitionOut;

            }
        },

        _transitionOut: function (data) {
            return this._enqueue(data.elements.concat(data.removeTargets), 'out');

        },

        _transitionIn: function (data, aborting) {
            var elements = aborting ? data.elements.concat(data.removeTargets) : data.elements;

            if (elements.length) {
                return this._enqueue(elements, 'in')
                    .then(function () {
                        DOM.removeClass(elements, 'nittro-dynamic-add', 'nittro-dynamic-remove');
                    });

            }
        },

        _enqueue: function (elements, dir) {
            if (!this._.ready) {
                return new Promise(function (fulfill) {
                    this._.queue.push([elements, dir, fulfill]);

                }.bind(this));
            }

            this._.ready = false;
            return this._transition(elements, dir);

        },

        _transition: function(elements, dir) {
            return this._.transitionHelper.transition(elements, {
                    add: 'nittro-transition-active nittro-transition-' + dir,
                    remove: 'nittro-transition-middle',
                    after: dir === 'out' ? 'nittro-transition-middle' : null
                }, dir === 'in')
                .then(function () {
                    if (this._.queue.length) {
                        var q = this._.queue.shift();

                        this._transition(q[0], q[1]).then(function () {
                            q[2](q[0]);

                        });
                    } else {
                        this._.ready = true;

                    }
                }.bind(this));
        },

        _getTransitionTargets: function(elem) {
            var sel = elem ? DOM.getData(elem, 'transition') : undefined,
                targets;

            if (sel === undefined && (!elem || !DOM.getData(elem, 'dynamic-remove'))) {
                sel = this._.options.defaultSelector;

            }

            targets = sel ? DOM.find(sel) : [];

            this.trigger('prepare-targets', {
                element: elem,
                targets: targets
            });

            return targets;

        },

        _getRemoveTargets: function (elem) {
            var sel = DOM.getData(elem, 'dynamic-remove');
            return sel ? DOM.find(sel) : [];

        }
    });

    _context.register(TransitionAgent, 'TransitionAgent');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays'
});
;
_context.invoke('Nittro.Page', function(Url, undefined) {

    var Transaction = _context.extend('Nittro.Object', function (url) {
        Transaction.Super.call(this);

        this._.url = Url.from(url);
        this._.history = true;
        this._.agents = {};
        this._.data = {};

        this._.promise = new Promise(function(fulfill, reject) {
            this._.fulfill = fulfill;
            this._.reject = reject;
        }.bind(this));

    }, {
        add: function(name, agent) {
            this._.agents[name] = agent;
            return this;
        },

        getUrl: function() {
            return this._.url;
        },

        setUrl: function(url) {
            this._.url = Url.from(url);
            return this;
        },

        isHistoryState: function() {
            return this._.history;
        },

        setIsHistoryState: function(value) {
            this._.history = value;
            return this;
        },

        init: function (context) {
            for (var name in this._.agents) {
                if (this._.agents.hasOwnProperty(name)) {
                    this._.data[name] = this._.agents[name].init(this, context);
                }
            }

            return this;

        },

        dispatch: function() {
            var name, result, queue = [];

            for (name in this._.agents) {
                if (this._.agents.hasOwnProperty(name)) {
                    result = this._.agents[name].dispatch(this, this._.data[name]);

                    if (result) {
                        queue.push(result);
                    }
                }
            }

            if (queue.length) {
                Promise.all(queue).then(this._.fulfill.bind(this), this._.reject.bind(this));

            } else {
                this._.reject();

            }

            return this;

        },

        abort: function() {
            for (var name in this._.agents) {
                if (this._.agents.hasOwnProperty(name)) {
                    this._.agents[name].abort(this, this._.data[name]);
                }
            }

            this._.reject();

            return this;

        },

        then: function(onfulfilled, onrejected) {
            return this._.promise.then(onfulfilled, onrejected);
        },

        dispatchAgentAction: function(agent, action, data) {
            var name, result, queue = [];

            for (name in this._.agents) {
                if (name !== agent && this._.agents.hasOwnProperty(name)) {
                    result = this._.agents[name].handleAction(this, agent, action, data, this._.data[name]);

                    if (result) {
                        queue.push(result);
                    }
                }
            }

            return queue.length ? Promise.all(queue) : Promise.resolve();

        }
    });

    _context.register(Transaction, 'Transaction');

}, {
    Url: 'Utils.Url'
});
;
_context.invoke('Nittro.Page', function (Transaction, DOM, Arrays, Url) {

    var Service = _context.extend('Nittro.Object', function (ajaxAgent, snippetAgent, historyAgent, snippetManager, options) {
        Service.Super.call(this);

        this._.ajaxAgent = ajaxAgent;
        this._.snippetAgent = snippetAgent;
        this._.historyAgent = historyAgent;
        this._.snippetManager = snippetManager;
        this._.options = Arrays.mergeTree({}, Service.defaults, options);
        this._.setup = false;
        this._.currentTransaction = null;
        this._.currentUrl = Url.fromCurrent();

        DOM.addListener(window, 'popstate', this._handleState.bind(this));
        DOM.addListener(document, 'click', this._handleLinkClick.bind(this));
        this.on('error:default', this._showError.bind(this));

        this._checkReady();

    }, {
        STATIC: {
            defaults: {
                whitelistLinks: false
            }
        },

        open: function (url, method, data, context) {
            try {
                context || (context = {});
                context.method = method;
                context.data = data;

                var transaction = this._createTransaction(url),
                    promise;

                transaction.init(context);

                promise = this._dispatchTransaction(transaction);

                context.event && context.event.preventDefault();

                return promise;

            } catch (e) {
                return Promise.reject(e);

            }
        },

        openLink: function (link, evt) {
            return this.open(link.href, 'get', null, {
                event: evt,
                element: link
            });
        },

        getSnippet: function (id) {
            return this._.snippetManager.getSnippet(id);

        },

        isSnippet: function (elem) {
            return this._.snippetManager.isSnippet(elem);

        },

        _handleState: function (evt) {
            if (evt.state === null) {
                return;
            }

            if (!this._checkUrl(null, this._.currentUrl)) {
                return;

            }

            var url = Url.fromCurrent();
            this._.currentUrl = url;

            try {
                this.open(url, 'get', null, {history: false});

            } catch (e) {
                document.location.href = url.toAbsolute();

            }
        },

        _checkReady: function () {
            if (document.readyState === 'loading') {
                DOM.addListener(document, 'readystatechange', this._checkReady.bind(this));
                return;

            }

            if (!this._.setup) {
                this._.setup = true;

                window.setTimeout(function () {
                    window.history.replaceState({_nittro: true}, document.title, document.location.href);
                    this._.snippetManager.setup();
                    this._showHtmlFlashes();
                    this.trigger('update');

                }.bind(this), 1);
            }
        },

        _handleLinkClick: function(evt) {
            if (evt.defaultPrevented || evt.ctrlKey || evt.shiftKey || evt.altKey || evt.metaKey || evt.button > 0) {
                return;

            }

            var link = DOM.closest(evt.target, 'a');

            if (!link || !this._checkLink(link) || !this._checkUrl(link.href)) {
                return;

            }

            this.openLink(link, evt);

        },

        _createTransaction: function(url) {
            var transaction = new Transaction(url);

            transaction.add('ajax', this._.ajaxAgent);
            transaction.add('snippets', this._.snippetAgent);
            transaction.add('history', this._.historyAgent);

            this.trigger('transaction-created', {
                transaction: transaction
            });

            return transaction;

        },

        _dispatchTransaction: function(transaction) {
            if (this._.currentTransaction) {
                this._.currentTransaction.abort();
            }

            this._.currentTransaction = transaction;

            return transaction.dispatch().then(
                this._handleSuccess.bind(this, transaction),
                this._handleError.bind(this)
            );

        },

        _checkUrl: function(url, current) {
            return this._.ajaxAgent.checkUrl(url, current);

        },

        _checkLink: function (link) {
            if (link.getAttribute('target')) {
                return false;
            }

            return this._.options.whitelistLinks ? DOM.hasClass(link, 'nittro-ajax') : !DOM.hasClass(link, 'nittro-no-ajax');

        },

        _showFlashes: function (flashes) {
            if (!flashes) {
                return;

            }

            var id, i;

            for (id in flashes) {
                if (flashes.hasOwnProperty(id) && flashes[id]) {
                    for (i = 0; i < flashes[id].length; i++) {
                        flashes[id][i].target = id;
                        this.trigger('flash', flashes[id][i]);

                    }
                }
            }
        },

        _showHtmlFlashes: function () {
            var elms = DOM.getByClassName('nittro-flashes-src'),
                i, n, data;

            for (i = 0, n = elms.length; i < n; i++) {
                data = JSON.parse(elms[i].textContent.trim());
                elms[i].parentNode.removeChild(elms[i]);
                this._showFlashes(data);

            }
        },

        _handleSuccess: function(transaction) {
            if (transaction.isHistoryState()) {
                this._.currentUrl = transaction.getUrl();

            }

            this.trigger('update');

        },

        _handleError: function (err) {
            this.trigger('error', err);

        },

        _showError: function (evt) {
            if (evt.data.type === 'connection') {
                this.trigger('flash', {
                    type: 'error',
                    message: 'There was an error connecting to the server. Please check your internet connection and try again.'
                });
            } else if (evt.data.type !== 'abort') {
                this.trigger('flash', {
                    type: 'error',
                    message: 'There was an error processing your request. Please try again later.'
                });
            }
        }
    });

    _context.register(Service, 'Service');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays',
    Url: 'Utils.Url'
});
