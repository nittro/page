_context.invoke('Nittro.Ajax', function(undefined) {

    var FormData = _context.extend(function() {
        this._dataStorage = [];
        this._upload = false;

    }, {
        append: function(name, value) {
            if (value === undefined || value === null) {
                return this;

            }

            if (this._isFile(value)) {
                this._upload = true;

            } else if (typeof value === 'object' && 'valueOf' in value && /string|number|boolean/.test(typeof value.valueOf()) && !arguments[2]) {
                return this.append(name, value.valueOf(), true);

            } else if (!/string|number|boolean/.test(typeof value)) {
                throw new Error('Only scalar values and File/Blob objects can be appended to FormData, ' + (typeof value) + ' given');

            }

            this._dataStorage.push({ name: name, value: value });

            return this;

        },

        isUpload: function() {
            return this._upload;

        },

        _isFile: function(value) {
            return window.File !== undefined && value instanceof window.File || window.Blob !== undefined && value instanceof window.Blob;

        },

        mergeData: function(data) {
            for (var i = 0; i < data.length; i++) {
                this.append(data[i].name, data[i].value);

            }

            return this;

        },

        exportData: function(forcePlain) {
            if (!forcePlain && this.isUpload() && window.FormData !== undefined) {
                var fd = new window.FormData(),
                    i;

                for (i = 0; i < this._dataStorage.length; i++) {
                    fd.append(this._dataStorage[i].name, this._dataStorage[i].value);

                }

                return fd;

            } else {
                return this._dataStorage.filter(function(e) {
                    return !this._isFile(e.value);

                }, this);

            }
        }
    });

    _context.register(FormData, 'FormData');

});
;
_context.invoke('Nittro.Ajax', function (Url, FormData, undefined) {

    var Request = _context.extend('Nittro.Object', function(url, method, data) {
        this._ = {
            url: Url.from(url),
            method: (method || 'GET').toUpperCase(),
            data: data || {},
            headers: {},
            normalized: false,
            aborted: false
        };
    }, {
        getUrl: function () {
            this._normalize();
            return this._.url;

        },

        getMethod: function () {
            return this._.method;

        },

        isGet: function () {
            return this._.method === 'GET';

        },

        isPost: function () {
            return this._.method === 'POST';

        },

        isMethod: function (method) {
            return method.toUpperCase() === this._.method;

        },

        getData: function () {
            this._normalize();
            return this._.data;

        },

        getHeaders: function () {
            return this._.headers;

        },

        setUrl: function (url) {
            this._updating('url');
            this._.url = Url.from(url);
            return this;

        },

        setMethod: function (method) {
            this._updating('method');
            this._.method = method.toLowerCase();
            return this;

        },

        setData: function (k, v) {
            this._updating('data');

            if (k === null) {
                this._.data = {};

            } else if (v === undefined && typeof k === 'object') {
                for (v in k) {
                    if (k.hasOwnProperty(v)) {
                        this._.data[v] = k[v];

                    }
                }
            } else {
                this._.data[k] = v;

            }

            return this;

        },

        setHeader: function (header, value) {
            this._updating('headers');
            this._.headers[header] = value;
            return this;

        },

        setHeaders: function (headers) {
            this._updating('headers');

            for (var header in headers) {
                if (headers.hasOwnProperty(header)) {
                    this._.headers[header] = headers[header];

                }
            }

            return this;

        },

        abort: function () {
            if (!this._.aborted) {
                this._.aborted = true;
                this.trigger('abort');

            }

            return this;

        },

        isAborted: function () {
            return this._.aborted;

        },

        _normalize: function() {
            if (this._.normalized || !this.isFrozen()) {
                return;

            }

            this._.normalized = true;

            if (this._.method === 'GET' || this._.method === 'HEAD') {
                this._.url.addParams(this._.data instanceof FormData ? this._.data.exportData(true) : this._.data);
                this._.data = {};

            }
        }
    });

    _context.mixin(Request, 'Nittro.Freezable');
    _context.register(Request, 'Request');

}, {
    Url: 'Utils.Url'
});
;
_context.invoke('Nittro.Ajax', function () {

    var Response = _context.extend(function(status, payload, headers) {
        this._ = {
            status: status,
            payload: payload,
            headers: headers
        };
    }, {
        getStatus: function () {
            return this._.status;

        },

        getPayload: function () {
            return this._.payload;

        },

        getHeader: function (name) {
            return this._.headers[name.toLowerCase()];

        },

        getAllHeaders: function () {
            return this._.headers;

        }
    });

    _context.register(Response, 'Response');

});
;
_context.invoke('Nittro.Ajax', function (Request) {

    var Service = _context.extend('Nittro.Object', function () {
        Service.Super.call(this);

        this._.transports = [];

    }, {
        addTransport: function (transport) {
            this._.transports.push(transport);
            return this;

        },

        'get': function (url, data) {
            return this.dispatch(this.createRequest(url, 'get', data));

        },

        post: function (url, data) {
            return this.dispatch(this.createRequest(url, 'post', data));

        },

        createRequest: function (url, method, data) {
            var request = new Request(url, method, data);
            this.trigger('request-created', {request: request});
            return request;

        },

        dispatch: function (request) {
            request.freeze();

            for (var i = 0; i < this._.transports.length; i++) {
                try {
                    return this._.transports[i].dispatch(request);

                } catch (e) { console.log(e); }
            }

            throw new Error('No transport is able to dispatch this request');

        }
    });

    _context.register(Service, 'Service');

});
;
_context.invoke('Nittro.Ajax.Transport', function (Response, FormData, Url) {

    var Native = _context.extend(function() {

    }, {
        STATIC: {
            createXhr: function () {
                if (window.XMLHttpRequest) {
                    return new XMLHttpRequest();

                } else if (window.ActiveXObject) {
                    try {
                        return new ActiveXObject('Msxml2.XMLHTTP');

                    } catch (e) {
                        return new ActiveXObject('Microsoft.XMLHTTP');

                    }
                }
            }
        },

        dispatch: function (request) {
            var xhr = Native.createXhr(),
                adv = this.checkSupport(xhr),
                self = this;

            var abort = function () {
                xhr.abort();

            };

            var cleanup = function () {
                request.off('abort', abort);

            };

            request.on('abort', abort);

            return new Promise(function (fulfill, reject) {
                if (request.isAborted()) {
                    cleanup();
                    reject(self._createError(xhr, {type: 'abort'}));

                }

                self._bindEvents(request, xhr, adv, cleanup, fulfill, reject);

                xhr.open(request.getMethod(), request.getUrl().toAbsolute(), true);

                var data = self._formatData(request, xhr);
                self._addHeaders(request, xhr);
                xhr.send(data);

            });
        },

        checkSupport: function (xhr) {
            var adv;

            if (!(adv = 'addEventListener' in xhr) && !('onreadystatechange' in xhr)) {
                throw new Error('Unsupported XHR implementation');

            }

            return adv;

        },

        _bindEvents: function (request, xhr, adv, cleanup, fulfill, reject) {
            var self = this;

            var onLoad = function (evt) {
                cleanup();

                if (xhr.status === 200) {
                    var response = self._createResponse(xhr);
                    request.trigger('success', response);
                    fulfill(response);

                } else {
                    var err = self._createError(xhr, evt);
                    request.trigger('error', err);
                    reject(err);

                }
            };

            var onError = function (evt) {
                cleanup();
                var err = self._createError(xhr, evt);
                request.trigger('error', err);
                reject(err);

            };

            var onProgress = function (evt) {
                request.trigger('progress', {
                    lengthComputable: evt.lengthComputable,
                    loaded: evt.loaded,
                    total: evt.total
                });
            };

            if (adv) {
                xhr.addEventListener('load', onLoad, false);
                xhr.addEventListener('error', onError, false);
                xhr.addEventListener('abort', onError, false);

                if ('upload' in xhr) {
                    xhr.upload.addEventListener('progress', onProgress, false);

                }
            } else {
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            onLoad();

                        } else {
                            onError();

                        }
                    }
                };

                if ('ontimeout' in xhr) {
                    xhr.ontimeout = onError;

                }

                if ('onerror' in xhr) {
                    xhr.onerror = onError;

                }

                if ('onload' in xhr) {
                    xhr.onload = onLoad;

                }
            }
        },

        _addHeaders: function (request, xhr) {
            var headers = request.getHeaders(),
                h;

            for (h in headers) {
                if (headers.hasOwnProperty(h)) {
                    xhr.setRequestHeader(h, headers[h]);

                }
            }

            if (!headers.hasOwnProperty('X-Requested-With')) {
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

            }
        },

        _formatData: function (request, xhr) {
            var data = request.getData();

            if (data instanceof FormData) {
                data = data.exportData(request.isGet() || request.isMethod('HEAD'));

                if (!(data instanceof window.FormData)) {
                    data = Url.buildQuery(data, true);
                    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

                }
            } else {
                data = Url.buildQuery(data);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

            }

            return data;

        },

        _createResponse: function (xhr) {
            var payload,
                headers = {};

            (xhr.getAllResponseHeaders() || '').trim().split(/\r\n/g).forEach(function(header) {
                if (header && !header.match(/^\s+$/)) {
                    header = header.match(/^\s*([^:]+):\s*(.+)\s*$/);
                    headers[header[1].toLowerCase()] = header[2];

                }
            });

            if (headers['content-type'] && headers['content-type'].split(/;/)[0] === 'application/json') {
                payload = JSON.parse(xhr.responseText || '{}');

            } else {
                payload = xhr.responseText;

            }

            return new Response(xhr.status, payload, headers);

        },

        _createError: function (xhr, evt) {
            var response = null;

            if (xhr.readyState === 4 && xhr.status !== 0) {
                response = this._createResponse(xhr);

            }

            if (evt && evt.type === 'abort') {
                return {
                    type: 'abort',
                    status: null,
                    response: response
                };
            } else if (xhr.status === 0) {
                return {
                    type: 'connection',
                    status: null,
                    response: response
                };
            } else if (xhr.status !== 200) {
                return {
                    type: 'response',
                    status: xhr.status,
                    response: response
                };
            }

            return {
                type: 'unknown',
                status: xhr.status,
                response: response
            };
        }
    });

    _context.register(Native, 'Native');

}, {
    Url: 'Utils.Url',
    Response: 'Nittro.Ajax.Response',
    FormData: 'Nittro.Ajax.FormData'
});
;
_context.invoke('Nittro.Page', function (DOM, undefined) {

    var Snippet = _context.extend(function (id, state) {
        this._ = {
            id: id,
            container: false,
            state: typeof state === 'number' ? state : Snippet.INACTIVE,
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
                if (this._.state === Snippet.PREPARE_SETUP) {
                    prepare(this.getElement());

                } else {
                    this._.handlers[Snippet.PREPARE_SETUP].push(prepare);

                }
            }

            if (run) {
                if (this._.state === Snippet.RUN_SETUP) {
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
                if (this._.state === Snippet.PREPARE_TEARDOWN) {
                    prepare(this.getElement());

                } else {
                    this._.handlers[Snippet.PREPARE_TEARDOWN].push(prepare);

                }
            }

            if (run) {
                if (this._.state === Snippet.RUN_TEARDOWN) {
                    run(this.getElement());

                } else {
                    this._.handlers[Snippet.RUN_TEARDOWN].push(run);

                }
            }

            return this;

        },

        setState: function (state) {
            if (state === Snippet.INACTIVE) {
                this._.state = state;

                this._.handlers.forEach(function (queue) {
                    queue.splice(0, queue.length);

                });

            } else if (state - 1 === this._.state) {
                this._.state = state;

                var elm = this.getElement();

                this._.handlers[this._.state].forEach(function (handler) {
                    handler(elm);

                });

                this._.handlers[this._.state].splice(0, this._.handlers[this._.state].length);

            }

            return this;

        },

        getState: function () {
            return this._.state;

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
_context.invoke('Nittro.Page', function (Snippet, DOM) {

    var SnippetHelpers = {
        _getTransitionTargets: function (elem) {
            var sel = DOM.getData(elem, 'transition');

            if (sel === null && !DOM.getData(elem, 'dynamic-remove')) {
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
                this._.containerCache = DOM.getByClassName('snippet-container')
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
                    DOM.addClass(snippet.content, 'dynamic-add');
                    return snippet.content;

                } else {
                    DOM.addClass(snippet.elem, 'dynamic-update');
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
                dyn = DOM.hasClass(snippet.parentNode, 'snippet-container');

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
                return elem.length ? DOM.getData(elem[0], prop) : null;
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
;
_context.invoke('Nittro.Page', function (DOM, Arrays) {

    var Transitions = _context.extend(function(duration) {
        this._ = {
            duration: duration || false,
            ready: true,
            queue: [],
            support: false
        };

        try {
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
        transitionOut: function (elements) {
            return this._begin(elements, 'transition-out');

        },

        transitionIn: function (elements) {
            return this._begin(elements, 'transition-in');

        },

        _begin: function (elements, className) {
            if (!this._.support || !this._.duration || !elements.length) {
                return Promise.resolve(elements);

            } else {
                return this._resolve(elements, className);

            }
        },

        _resolve: function (elements, className) {
            if (!this._.ready) {
                return new Promise(function (fulfill) {
                    this._.queue.push([elements, className, fulfill]);

                }.bind(this));
            }

            this._.ready = false;

            if (className === 'transition-in') {
                var foo = window.pageXOffset; // needed to force layout and thus run asynchronously

            }

            DOM.addClass(elements, 'transition-active ' + className);
            DOM.removeClass(elements, 'transition-middle');

            var duration = this._getDuration(elements);

            var promise = new Promise(function (fulfill) {
                window.setTimeout(function () {
                    DOM.removeClass(elements, 'transition-active ' + className);

                    if (className === 'transition-out') {
                        DOM.addClass(elements, 'transition-middle');

                    }

                    this._.ready = true;

                    fulfill(elements);

                }.bind(this), duration);
            }.bind(this));

            promise.then(function () {
                if (this._.queue.length) {
                    var q = this._.queue.shift();

                    this._resolve(q[0], q[1]).then(function () {
                        q[2](q[0]);

                    });
                }
            }.bind(this));

            return promise;

        },

        _getDuration: function (elements) {
            if (!window.getComputedStyle) {
                return this._.duration;

            }

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
            
            if (durations.length) {
                return Math.max.apply(null, durations);

            } else {
                return this._.duration;

            }
        }
    });

    _context.register(Transitions, 'Transitions');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays'
});
;
_context.invoke('Nittro.Page', function (DOM, Arrays, Url, SnippetHelpers, Snippet) {

    var Service = _context.extend('Nittro.Object', function (ajax, transitions, flashMessages, options) {
        Service.Super.call(this);

        this._.ajax = ajax;
        this._.transitions = transitions;
        this._.flashMessages = flashMessages;
        this._.request = null;
        this._.snippets = {};
        this._.containerCache = null;
        this._.currentPhase = Snippet.INACTIVE;
        this._.transitioning = null;
        this._.setup = false;
        this._.currentUrl = Url.fromCurrent();
        this._.options = Arrays.mergeTree({}, Service.defaults, options);

        DOM.addListener(document, 'click', this._handleClick.bind(this));
        DOM.addListener(document, 'submit', this._handleSubmit.bind(this));
        DOM.addListener(window, 'popstate', this._handleState.bind(this));
        this.on('error:default', this._showError.bind(this));

        this._checkReady();

    }, {
        STATIC: {
            defaults: {
                whitelistRedirects: false,
                whitelistLinks: true,
                whitelistForms: true,
                defaultTransition: null
            }
        },

        setFormLocator: function (formLocator) {
            this._.formLocator = formLocator;
            return this;

        },

        open: function (url, method, data) {
            return this._createRequest(url, method, data);

        },

        openLink: function (link, evt) {
            return this._createRequest(link.href, 'get', null, evt, link);

        },

        sendForm: function (form, evt) {
            this._checkFormLocator(true);

            var frm = this._.formLocator.getForm(form),
                data = frm.serialize();

            return this._createRequest(form.action, form.method, data, evt, form)
                .then(function () {
                    frm.reset();

                });
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

        _checkFormLocator: function (need) {
            if (this._.formLocator) {
                return true;

            } else if (!need) {
                return false;

            }

            throw new Error("Nittro/Page service: Form support wasn't enabled. Please install Nittro/Application and inject the FormLocator service using the setFormLocator() method.");

        },

        _handleState: function (evt) {
            if (evt.state === null) {
                return;
            }

            var url = Url.fromCurrent(),
                request;

            if (!this._checkUrl(url)) {
                return;

            }

            this._.currentUrl = url;
            request = this._.ajax.createRequest(url);

            try {
                this._dispatchRequest(request);

            } catch (e) {
                document.location.href = url.toAbsolute();

            }
        },

        _pushState: function (payload, url) {
            if (payload.postGet) {
                url = payload.url;

            }

            if (payload.title) {
                document.title = payload.title;

            }

            this._.currentUrl = Url.from(url);
            window.history.pushState({ _nittro: true }, document.title, this._.currentUrl.toAbsolute());

        },

        _checkReady: function () {
            if (document.readyState === 'loading') {
                DOM.addListener(document, 'readystatechange', this._checkReady.bind(this));
                return;

            }

            if (!this._.setup) {
                this._.setup = true;

                window.setTimeout(function () {
                    window.history.replaceState({ _nittro: true }, document.title, document.location.href);
                    this._setup();
                    this._showHtmlFlashes();
                    this.trigger('update');

                }.bind(this), 1);
            }
        },

        _checkLink: function (link) {
            return this._.options.whitelistLinks ? DOM.hasClass(link, 'ajax') : !DOM.hasClass(link, 'noajax');

        },

        _handleClick: function (evt) {
            if (evt.defaultPrevented || evt.ctrlKey || evt.shiftKey || evt.altKey || evt.metaKey) {
                return;

            }

            if (this._checkFormLocator() && this._handleButton(evt)) {
                return;

            }

            var link = DOM.closest(evt.target, 'a');

            if (!link || !this._checkLink(link) || !this._checkUrl(link.href)) {
                return;

            }

            this.openLink(link, evt);

        },

        _checkForm: function (form) {
            return this._.options.whitelistForms ? DOM.hasClass(form, 'ajax') : !DOM.hasClass(form, 'noajax');

        },

        _handleButton: function(evt) {
            var btn = DOM.closest(evt.target, 'button') || DOM.closest(evt.target, 'input'),
                frm;

            if (btn && btn.type === 'submit') {
                if (btn.form && this._checkForm(btn.form)) {
                    frm = this._.formLocator.getForm(btn.form);
                    frm.setSubmittedBy(btn.name || null);

                }

                return true;

            }
        },

        _handleSubmit: function (evt) {
            if (evt.defaultPrevented || !this._checkFormLocator()) {
                return;

            }

            if (!(evt.target instanceof HTMLFormElement) || !this._checkForm(evt.target) || !this._checkUrl(evt.target.action)) {
                return;

            }

            this.sendForm(evt.target, evt);

        },

        _createRequest: function (url, method, data, evt, context) {
            if (this._.request) {
                this._.request.abort();

            }

            var create = this.trigger('create-request', {
                url: url,
                method: method,
                data: data,
                context: context
            });

            if (create.isDefaultPrevented()) {
                evt && evt.preventDefault();
                return Promise.reject();

            }

            var request = this._.ajax.createRequest(url, method, data);

            try {
                var p = this._dispatchRequest(request, context, true);
                evt && evt.preventDefault();
                return p;

            } catch (e) {
                return Promise.reject(e);

            }
        },

        _dispatchRequest: function (request, context, pushState) {
            this._.request = request;

            var xhr = this._.ajax.dispatch(request); // may throw exception

            var transitionElms,
                removeElms,
                transition;

            if (context) {
                transitionElms = this._getTransitionTargets(context);
                removeElms = this._getRemoveTargets(context);

                if (removeElms.length) {
                    DOM.addClass(removeElms, 'dynamic-remove');

                }

                this._.transitioning = transitionElms.concat(removeElms);
                transition = this._.transitions.transitionOut(this._.transitioning.slice());

            } else {
                transitionElms = [];
                removeElms = [];
                transition = null;

            }

            var p = Promise.all([xhr, transitionElms, removeElms, pushState || false, transition]);
            return p.then(this._handleResponse.bind(this), this._handleError.bind(this));

        },

        _handleResponse: function (queue) {
            if (!this._.request) {
                this._cleanup();
                return null;

            }

            var response = queue[0],
                transitionElms = queue[1] || this._.transitioning || [],
                removeElms = queue[2],
                pushState = queue[3],
                payload = response.getPayload();

            if (typeof payload !== 'object' || !payload) {
                this._cleanup();
                return null;

            }

            this._showFlashes(payload.flashes);

            if (this._tryRedirect(payload, pushState)) {
                return payload;

            } else if (pushState) {
                this._pushState(payload, this._.request.getUrl());

            }

            this._.request = this._.transitioning = null;

            var dynamic = this._applySnippets(payload.snippets || {}, removeElms);
            DOM.toggleClass(dynamic, 'transition-middle', true);

            this._showHtmlFlashes();

            this.trigger('update', payload);

            this._.transitions.transitionIn(transitionElms.concat(dynamic))
                .then(function () {
                    DOM.removeClass(dynamic, 'dynamic-add dynamic-update');

                });

            return payload;

        },

        _checkUrl: function(url) {
            var u = Url.from(url),
                c = Url.fromCurrent(),
                d = u.compare(c);

            if (d === Url.PART.HASH && !u.getHash()) {
                return true;

            }

            return d === 0 || d < Url.PART.PORT && d > Url.PART.HASH;

        },

        _checkRedirect: function (payload) {
            return !this._.options.whitelistRedirects !== !payload.allowAjax && this._checkUrl(payload.redirect);

        },

        _tryRedirect: function (payload, pushState) {
            if ('redirect' in payload) {
                if (this._checkRedirect(payload)) {
                    this._dispatchRequest(this._.ajax.createRequest(payload.redirect), null, pushState);

                } else {
                    document.location.href = payload.redirect;

                }

                return true;

            }
        },

        _cleanup: function () {
            this._.request = null;

            if (this._.transitioning) {
                this._.transitions.transitionIn(this._.transitioning);
                this._.transitioning = null;

            }
        },

        _showFlashes: function (flashes) {
            if (!flashes) {
                return;

            }

            var id, i;

            for (id in flashes) {
                if (flashes.hasOwnProperty(id) && flashes[id]) {
                    for (i = 0; i < flashes[id].length; i++) {
                        this._.flashMessages.add(null, flashes[id][i].type, flashes[id][i].message);

                    }
                }
            }
        },

        _showHtmlFlashes: function () {
            var elms = DOM.getByClassName('flashes-src'),
                i, n, data;

            for (i = 0, n = elms.length; i < n; i++) {
                data = JSON.parse(elms[i].textContent.trim());
                elms[i].parentNode.removeChild(elms[i]);
                this._showFlashes(data);

            }
        },

        _handleError: function (evt) {
            this._cleanup();
            this.trigger('error', evt);

        },

        _showError: function (evt) {
            if (evt.data.type === 'connection') {
                this._.flashMessages.add(null, 'error', 'There was an error connecting to the server. Please check your internet connection and try again.');

            } else if (evt.data.type !== 'abort') {
                this._.flashMessages.add(null, 'error', 'There was an error processing your request. Please try again later.');

            }
        }
    });

    _context.mixin(Service, SnippetHelpers);

    _context.register(Service, 'Service');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays',
    Url: 'Utils.Url'
});
;
_context.invoke('Nittro.Widgets', function (DOM, Arrays) {

    var FlashMessages = _context.extend(function (options) {
        this._ = {
            options: Arrays.mergeTree({}, FlashMessages.defaults, options),
            globalHolder: DOM.create('div', {'class': 'flash-global-holder'})
        };

        this._.options.layer.appendChild(this._.globalHolder);

        if (!this._.options.positioning) {
            this._.options.positioning = FlashMessages.basicPositioning;

        }

    }, {
        STATIC: {
            defaults: {
                layer: null,
                minMargin: 20,
                positioning: null
            },
            basicPositioning: [
                function(target, elem, minMargin) {
                    var res = {
                        name: 'below',
                        left: target.left + (target.width - elem.width) / 2,
                        top: target.bottom
                    };

                    if (target.bottom + elem.height + minMargin < window.innerHeight && res.left > 0 && res.left + elem.width < window.innerWidth) {
                        return res;

                    }
                },
                function (target, elem, minMargin) {
                    var res = {
                        name: 'rightOf',
                        left: target.right,
                        top: target.top + (target.height - elem.height) / 2
                    };

                    if (target.right + elem.width + minMargin < window.innerWidth && res.top > 0 && res.top + elem.height < window.innerHeight) {
                        return res;

                    }
                },
                function (target, elem, minMargin) {
                    var res = {
                        name: 'above',
                        left: target.left + (target.width - elem.width) / 2,
                        top: target.top - elem.height
                    };

                    if (target.top > elem.height + minMargin && res.left > 0 && res.left + elem.width < window.innerWidth) {
                        return res;

                    }
                },
                function (target, elem, minMargin) {
                    var res = {
                        name: 'leftOf',
                        left: target.left - elem.width,
                        top: target.top + (target.height - elem.height) / 2
                    };

                    if (target.left > elem.width + minMargin && res.top > 0 && res.top + elem.height < window.innerHeight) {
                        return res;

                    }
                }
            ]
        },
        add: function (target, type, content, rich) {
            var elem = DOM.create('div', {
                'class': 'flash flash-' + (type || 'info')
            });

            if (target && typeof target === 'string') {
                target = DOM.getById(target);

            }

            if (rich) {
                DOM.html(elem, content);

            } else {
                elem.textContent = content;

            }

            DOM.setStyle(elem, 'opacity', 0);
            this._.options.layer.appendChild(elem);

            var style = {},
                timeout = Math.max(2000, Math.round(elem.textContent.split(/\s+/).length / 0.003));

            if (target) {
                var fixed = this._hasFixedParent(target),
                    elemRect = this._getRect(elem),
                    targetRect = this._getRect(target),
                    position;

                if (fixed) {
                    style.position = 'fixed';

                }

                for (var i = 0; i < this._.options.positioning.length; i++) {
                    if (position = this._.options.positioning[i].call(null, targetRect, elemRect, this._.options.minMargin)) {
                        break;

                    }
                }

                if (position) {
                    style.left = position.left;
                    style.top = position.top;

                    if (!fixed) {
                        style.left += window.pageXOffset;
                        style.top += window.pageYOffset;

                    }

                    style.left += 'px';
                    style.top += 'px';
                    style.opacity = '';

                    DOM.setStyle(elem, style);
                    this._show(elem, position.name, timeout);
                    return;

                }
            }

            this._.globalHolder.appendChild(elem);
            DOM.setStyle(elem, 'opacity', '');
            this._show(elem, 'global', timeout);

        },

        _show: function (elem, position, timeout) {
            DOM.addClass(elem, 'flash-show flash-' + position);

            window.setTimeout(function () {
                var foo = window.pageYOffset; // need to force css recalculation
                DOM.removeClass(elem, 'flash-show');
                this._bindHide(elem, timeout);

            }.bind(this), 1);
        },

        _bindHide: function (elem, timeout) {
            var hide = function () {
                DOM.removeListener(document, 'mousemove', hide);
                DOM.removeListener(document, 'mousedown', hide);
                DOM.removeListener(document, 'keydown', hide);
                DOM.removeListener(document, 'touchstart', hide);

                window.setTimeout(function () {
                    DOM.addClass(elem, 'flash-hide');

                    window.setTimeout(function () {
                        elem.parentNode.removeChild(elem);

                    }, 1000);
                }, timeout);
            }.bind(this);

            DOM.addListener(document, 'mousemove', hide);
            DOM.addListener(document, 'mousedown', hide);
            DOM.addListener(document, 'keydown', hide);
            DOM.addListener(document, 'touchstart', hide);

        },

        _hasFixedParent: function (elem) {
            do {
                if (elem.style.position === 'fixed') return true;
                elem = elem.offsetParent;

            } while (elem && elem !== document.documentElement && elem !== document.body);

            return false;

        },

        _getRect: function (elem) {
            var rect = elem.getBoundingClientRect();

            return {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                width: 'width' in rect ? rect.width : (rect.right - rect.left),
                height: 'height' in rect ? rect.height : (rect.bottom - rect.top)
            };
        }
    });

    _context.register(FlashMessages, 'FlashMessages');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays'
});
