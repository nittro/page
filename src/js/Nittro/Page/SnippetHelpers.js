_context.invoke('Nittro.Page', function (Snippet, DOM, undefined) {

    var SnippetHelpers = {
        _getTransitionTargets: function (elem) {
            var sel = DOM.getData(elem, 'transition');

            if (sel === undefined && !DOM.getData(elem, 'dynamic-remove')) {
                sel = this._.options.defaultTransition;

            }

            return sel ? DOM.find(sel) : [];

        },

        _getRemoveTargets: function (elem) {
            var sel = DOM.getData(elem, 'dynamic-remove');
            return sel ? DOM.find(sel) : [];

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

        _getDynamicContainer: function (id) {
            var cache = this._getDynamicContainerCache(),
                i, n, container, data;

            for (i = 0, n = cache.length; i < n; i++) {
                container = this.getSnippet(cache[i]);

                if (!container.isContainer()) {
                    data = this._prepareDynamicContainer(container);

                } else {
                    data = container.getData('_container');

                }

                if (data.mask.test(id)) {
                    return data;

                }
            }

            throw new Error('Dynamic snippet #' + id + ' has no container');

        },

        _applySnippets: function (snippets, removeElms) {
            var setup = {},
                teardown = {},
                dynamic = [],
                containers = {};

            this._clearDynamicContainerCache();

            this._prepareStaticSnippets(snippets, setup, teardown, dynamic, removeElms);
            this._prepareDynamicSnippets(dynamic, snippets, containers);
            this._prepareRemoveTargets(removeElms, teardown);

            this._teardown(teardown);

            this._applyRemove(removeElms);
            this._applyContainers(containers, teardown);
            this._applySetup(setup, snippets);

            this._setup();

            return dynamic.map(function (snippet) {
                if (!snippet.elem) {
                    DOM.addClass(snippet.content, 'nittro-dynamic-add');
                    return snippet.content;

                } else {
                    DOM.addClass(snippet.elem, 'nittro-dynamic-update');
                    return snippet.elem;

                }
            });
        },

        _prepareDynamicContainer: function (snippet) {
            var elem = snippet.getElement(),
                data = {
                    id: snippet.getId(),
                    mask: new RegExp('^' + DOM.getData(elem, 'dynamic-mask') + '$'),
                    element: DOM.getData(elem, 'dynamic-element') || 'div',
                    sort: DOM.getData(elem, 'dynamic-sort') || 'append',
                    sortCache: DOM.getData(elem, 'dynamic-sort-cache') === false ? false : null
                };

            snippet.setContainer();
            snippet.setData('_container', data);
            return data;

        },

        _prepareRemoveTargets: function (removeElms, teardown) {
            for (var i = 0; i < removeElms.length; i++) {
                this._prepareRemoveTarget(removeElms[i], teardown);

            }
        },

        _prepareRemoveTarget: function (elem, teardown) {
            this._cleanupChildSnippets(elem, teardown);
            this._cleanupForms(elem);

            if (this.isSnippet(elem)) {
                teardown[elem.id] = true;

            }
        },

        _prepareStaticSnippets: function (snippets, setup, teardown, dynamic, removeElms) {
            for (var id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    this._prepareStaticSnippet(id, setup, teardown, dynamic, removeElms);

                }
            }
        },

        _prepareStaticSnippet: function (id, setup, teardown, dynamic, removeElms) {
            if (this._.snippets[id] && this._.snippets[id].getState() === Snippet.RUN_SETUP) {
                teardown[id] = false;

            }

            var snippet = DOM.getById(id),
                dyn;

            if (snippet) {
                dyn = DOM.hasClass(snippet.parentNode, 'nittro-snippet-container');

                if (!removeElms.length || removeElms.indexOf(snippet) === -1) {
                    this._cleanupChildSnippets(snippet, teardown);
                    this._cleanupForms(snippet);

                    if (dyn) {
                        dynamic.push({id: id, elem: snippet});

                    } else {
                        setup[id] = snippet;

                    }
                } else {
                    dynamic.push({id: id});

                }
            } else {
                dynamic.push({id: id});

            }
        },

        _prepareDynamicSnippets: function (dynamic, snippets, containers) {
            for (var i = 0; i < dynamic.length; i++) {
                this._prepareDynamicSnippet(dynamic[i], snippets[dynamic[i].id], containers);

            }
        },

        _prepareDynamicSnippet: function (snippet, content, containers) {
            var container = this._getDynamicContainer(snippet.id);

            snippet.content = this._createDynamic(container.element, snippet.id, content);

            if (!containers[container.id]) {
                containers[container.id] = [];

            }

            containers[container.id].push(snippet);

        },

        _createDynamic: function (elem, id, html) {
            elem = elem.split(/\./g);
            elem[0] = DOM.create(elem[0], { id: id });

            if (elem.length > 1) {
                DOM.addClass.apply(null, elem);

            }

            elem = elem[0];
            DOM.html(elem, html);
            return elem;

        },

        _applyRemove: function (removeElms) {
            removeElms.forEach(function (elem) {
                elem.parentNode.removeChild(elem);

            });
        },

        _applySetup: function (snippets, data) {
            for (var id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    DOM.html(snippets[id], data[id]);

                }
            }
        },

        _applyContainers: function (containers, teardown) {
            for (var id in containers) {
                if (containers.hasOwnProperty(id)) {
                    this._applyDynamic(this.getSnippet(id), containers[id], teardown);

                }
            }
        },

        _applyDynamic: function (container, snippets, teardown) {
            var containerData = container.getData('_container');

            if (containerData.sort === 'append') {
                this._appendDynamic(container.getElement(), snippets);

            } else if (containerData.sort === 'prepend') {
                this._prependDynamic(container.getElement(), snippets);

            } else {
                this._sortDynamic(containerData, container.getElement(), snippets, teardown);

            }
        },

        _appendDynamic: function (elem, snippets) {
            snippets.forEach(function (snippet) {
                if (snippet.elem) {
                    DOM.html(snippet.elem, snippet.content.innerHTML);

                } else {
                    elem.appendChild(snippet.content);

                }
            });
        },

        _prependDynamic: function (elem, snippets) {
            var first = elem.firstChild;

            snippets.forEach(function (snippet) {
                if (snippet.elem) {
                    DOM.html(snippet.elem, snippet.content.innerHTML);

                } else {
                    elem.insertBefore(snippet.content, first);

                }
            });
        },

        _sortDynamic: function (container, elem, snippets, teardown) {
            var sortData = this._getSortData(container, elem, teardown);
            this._mergeSortData(sortData, snippets.map(function(snippet) { return snippet.content; }));

            var sorted = this._applySort(sortData);
            snippets = this._getSnippetMap(snippets);

            this._insertSorted(elem, sorted, snippets);

        },

        _insertSorted: function (container, sorted, snippets) {
            var i = 0, n = sorted.length, tmp;

            tmp = container.firstElementChild;

            while (i < n && sorted[i] in snippets && !snippets[sorted[i]].elem) {
                container.insertBefore(snippets[sorted[i]].content, tmp);
                i++;

            }

            while (n > i && sorted[n - 1] in snippets && !snippets[sorted[n - 1]].elem) {
                n--;

            }

            for (; i < n; i++) {
                if (sorted[i] in snippets) {
                    if (snippets[sorted[i]].elem) {
                        snippets[sorted[i]].elem.innerHTML = '';

                        if (snippets[sorted[i]].elem.previousElementSibling !== (i > 0 ? DOM.getById(sorted[i - 1]) : null)) {
                            container.insertBefore(snippets[sorted[i]].elem, i > 0 ? DOM.getById(sorted[i - 1]).nextElementSibling : container.firstElementChild);

                        }

                        while (tmp = snippets[sorted[i]].content.firstChild) {
                            snippets[sorted[i]].elem.appendChild(tmp);

                        }
                    } else {
                        container.insertBefore(snippets[sorted[i]].content, DOM.getById(sorted[i - 1]).nextElementSibling);

                    }
                }
            }

            while (n < sorted.length) {
                container.appendChild(snippets[sorted[n]].content);
                n++;

            }
        },

        _getSnippetMap: function (snippets) {
            var map = {};

            snippets.forEach(function (snippet) {
                map[snippet.id] = snippet;
            });

            return map;

        },

        _applySort: function (sortData) {
            var sorted = [],
                id;

            for (id in sortData.snippets) {
                sorted.push({ id: id, values: sortData.snippets[id] });

            }

            sorted.sort(this._compareDynamic.bind(this, sortData.descriptor));
            return sorted.map(function(snippet) { return snippet.id; });

        },

        _compareDynamic: function (descriptor, a, b) {
            var i, n, v;

            for (i = 0, n = descriptor.length; i < n; i++) {
                v = a.values[i] < b.values[i] ? -1 : (a.values[i] > b.values[i] ? 1 : 0);

                if (v !== 0) {
                    return v * (descriptor[i].asc ? 1 : -1);

                }
            }

            return 0;

        },

        _getSortData: function (container, elem, teardown) {
            var sortData = container.sortCache;

            if (!sortData) {
                sortData = this._buildSortData(container, elem, teardown);

                if (container.sortCache !== false) {
                    container.sortCache = sortData;

                }
            } else {
                for (var id in sortData.snippets) {
                    if (id in teardown && teardown[id]) {
                        delete sortData.snippets[id];

                    }
                }
            }

            return sortData;

        },

        _buildSortData: function (container, elem, teardown) {
            var sortData = {
                descriptor: container.sort.trim().split(/\s*,\s*/g).map(this._parseDescriptor.bind(this, container.id)),
                snippets: {}
            };

            this._mergeSortData(sortData, DOM.getChildren(elem), teardown);

            return sortData;

        },

        _mergeSortData: function (sortData, snippets, teardown) {
            snippets.forEach(function (snippet) {
                var id = snippet.id;

                if (!teardown || !(id in teardown) || !teardown[id]) {
                    sortData.snippets[id] = this._extractSortData(snippet, sortData.descriptor);

                }
            }.bind(this));
        },

        _extractSortData: function (snippet, descriptor) {
            return descriptor.map(function (field) {
                return field.extractor(snippet);

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
                return {extractor: this._getAttrExtractor(sel, attr), asc: asc};

            } else if (prop) {
                return {extractor: this._getDataExtractor(sel, prop), asc: asc};

            } else {
                return {extractor: this._getTextExtractor(sel), asc: asc};

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
        },

        _teardown: function (snippets) {
            this._setSnippetsState(snippets, Snippet.PREPARE_TEARDOWN);
            this._setSnippetsState(snippets, Snippet.RUN_TEARDOWN);
            this._setSnippetsState(snippets, Snippet.INACTIVE);

            this.trigger('teardown');

            for (var id in snippets) {
                if (snippets.hasOwnProperty(id) && snippets[id]) {
                    delete this._.snippets[id];

                }
            }
        },

        _setup: function () {
            this.trigger('setup');

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
        }
    };

    _context.register(SnippetHelpers, 'SnippetHelpers');

}, {
    DOM: 'Utils.DOM'
});
