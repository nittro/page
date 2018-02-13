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
