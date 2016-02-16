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
