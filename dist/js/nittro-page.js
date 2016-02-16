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

            if (headers['content-type'] === 'application/json') {
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
_context.invoke('Nittro.Page', function (DOM) {

    var Snippet = _context.extend(function (id, state) {
        this._ = {
            id: id,
            state: typeof state === 'number' ? state : Snippet.INACTIVE,
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

            } else if ((this._.state + 1) % 4 === state) {
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
;
_context.invoke('Nittro.Page', function (DOM) {

    var Transitions = _context.extend(function(duration) {
        this._ = {
            duration: duration || false,
            ready: true,
            queue: [],
            support: false,
            property: null
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
                if (prop in s) {
                    this._.property = prop;
                    return true;
                }
            }.bind(this));

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
                return new Promise(function (resolve) {
                    this._.queue.push([elements, className, resolve]);

                }.bind(this));
            }

            this._.ready = false;

            if (className === 'transition-in') {
                var foo = window.pageXOffset; // needed to force layout and thus run asynchronously

            }

            DOM.addClass(elements, 'transition-active ' + className);
            DOM.removeClass(elements, 'transition-middle');

            var duration = this._getDuration(elements);

            var promise = new Promise(function (resolve) {
                window.setTimeout(function () {
                    DOM.removeClass(elements, 'transition-active ' + className);

                    if (className === 'transition-out') {
                        DOM.addClass(elements, 'transition-middle');

                    }

                    this._.ready = true;

                    resolve(elements);

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

            var durations = [],
                prop = this._.property + 'Duration';

            elements.forEach(function (elem) {
                var duration = window.getComputedStyle(elem)[prop];

                if (duration) {
                    duration = (duration + '').trim().split(/\s*,\s*/g).map(function (v) {
                        v = v.match(/^((?:\d*\.)?\d+)(m?s)$/);

                        if (v) {
                            return parseFloat(v[1]) * (v[2] === 'ms' ? 1 : 1000);

                        } else {
                            return 0;

                        }
                    });

                    durations.push.apply(durations, duration.filter(function(v) { return v > 0; }));

                }
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
    DOM: 'Utils.DOM'
});
;
_context.invoke('Nittro.Page', function (DOM, Arrays, Url, SnippetManager, Snippet) {

    var Service = _context.extend('Nittro.Object', function (ajax, transitions, flashMessages, options) {
        Service.Super.call(this);

        this._.ajax = ajax;
        this._.transitions = transitions;
        this._.flashMessages = flashMessages;
        this._.snippetManager = new SnippetManager(this._handlePhase.bind(this));
        this._.request = null;
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
            this._.snippetManager.setFormLocator(formLocator);
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
            return this._.snippetManager.getSnippet(id);

        },

        isSnippet: function (elem) {
            return this._.snippetManager.isSnippet(elem);

        },


        _handlePhase: function (phase) {
            this.trigger(phase);

        },

        _checkFormLocator: function (need) {
            if (this._.formLocator) {
                return true;

            } else if (!need) {
                return false;

            }

            throw new Error("Nittro/Page service: Form support wasn't enabled. Please install Nittro/Application and inject the FormLocator service using the setFormLocator() method.");

        },

        _handleState: function () {
            var url = Url.fromCurrent(),
                request;

            if (url.compare(this._.currentUrl) <= Url.PART.HASH) {
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

            this._.currentUrl = Url.from(url);
            window.history.pushState(null, payload.title || document.title, this._.currentUrl.toAbsolute());

        },

        _checkReady: function () {
            if (document.readyState === 'loading') {
                DOM.addListener(document, 'readystatechange', this._checkReady.bind(this));
                return;

            }

            if (!this._.setup) {
                this._.setup = true;

                window.setTimeout(function () {
                    this._.snippetManager.setup();
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

            var link = DOM.closest(evt.target, 'a'),
                url;

            if (!link || !this._checkLink(link)) {
                return;

            }

            url = Url.from(link.href);

            if (!url.isLocal() || url.compare() === Url.PART.HASH) {
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

            if (!(evt.target instanceof HTMLFormElement) || !this._checkForm(evt.target)) {
                return;

            }

            this.sendForm(evt.target, evt);

        },

        _createRequest: function (url, method, data, evt, context) {
            if (this._.request) {
                this._.request.abort();

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

        _dispatchRequest: function (request, elem, pushState) {
            this._.request = request;

            var xhr = this._.ajax.dispatch(request); // may throw exception

            var transitionTargets,
                removeTarget = null,
                transition = null;

            if (elem) {
                transitionTargets = this._getTransitionTargets(elem);
                removeTarget = this._getRemoveTarget(elem);

                if (removeTarget) {
                    DOM.addClass(removeTarget, 'dynamic-remove');
                    transitionTargets.push(removeTarget);

                }

                transition = this._.transitions.transitionOut(transitionTargets);
                this._.transitioning = transitionTargets;

            }

            var p = Promise.all([xhr, transition, removeTarget, pushState || false]);
            p.then(this._handleResponse.bind(this), this._handleError.bind(this));
            return p;

        },

        _handleResponse: function (queue) {
            if (!this._.request) {
                this._cleanup();
                return;

            }

            var response = queue[0],
                transitionTargets = queue[1] || this._.transitioning || [],
                removeTarget = queue[2],
                pushState = queue[3],
                payload = response.getPayload();

            if (typeof payload !== 'object' || !payload) {
                this._cleanup();
                return;

            }

            this._showFlashes(payload.flashes);

            if (this._tryRedirect(payload)) {
                return;

            } else if (pushState) {
                this._pushState(payload || {}, this._.request.getUrl());

            }

            this._.request = this._.transitioning = null;
            removeTarget && transitionTargets.pop();

            var dynamic = this._.snippetManager.applySnippets(payload.snippets || {}, removeTarget);
            this._transitionDynamic(dynamic, transitionTargets);

            this._showHtmlFlashes();

            this.trigger('update', payload);

            this._.transitions.transitionIn(transitionTargets)
                .then(function () {
                    this._cleanupDynamic(dynamic);

                }.bind(this));

            return payload;

        },

        _checkRedirect: function (payload) {
            return !this._.options.whitelistRedirects !== !payload.allowAjax && Url.from(payload.redirect).isLocal();

        },

        _tryRedirect: function (payload) {
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

        _transitionDynamic: function (snippets, transitionTargets) {
            snippets.forEach(function (snippet) {
                DOM.addClass(snippet[1], snippet[2] ? 'dynamic-add' : 'dynamic-update');
                transitionTargets.push(snippet[1]);
            });
        },

        _cleanupDynamic: function (snippets) {
            snippets.forEach(function (snippet) {
                DOM.removeClass(snippet[1], snippet[2] ? 'dynamic-add' : 'dynamic-update');
            });
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

        _handleError: function (err) {
            this._cleanup();
            this.trigger('error', err);

        },

        _showError: function (evt) {
            this._.flashMessages.add(null, 'error', 'There was an error processing your request. Please try again later.');

        },

        _getTransitionTargets: function (elem) {
            var sel = DOM.getData(elem, 'transition') || this._.options.defaultTransition,
                elms = [];

            if (!sel) {
                return elms;

            }

            if (typeof sel === 'string') {
                sel = sel.trim().split(/\s*,\s*/g);

            }

            sel.forEach(function (sel) {
                if (sel.match(/^[^.#]|[\s\[>+:]/)) {
                    throw new TypeError('Invalid transition selector, only single-level .class and #id are allowed');

                }

                if (sel.charAt(0) === '#') {
                    sel = DOM.getById(sel.substr(1));
                    sel && elms.push(sel);

                } else {
                    var matching = DOM.getByClassName(sel.substr(1));
                    elms.push.apply(elms, matching);

                }
            });

            return elms;

        },

        _getRemoveTarget: function (elem) {
            var id = DOM.getData(elem, 'dynamicRemove');
            return id ? DOM.getById(id) : null;

        }
    });

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
