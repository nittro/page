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

            if (payload.title) {
                document.title = payload.title;

            }

            this._.currentUrl = Url.from(url);
            window.history.pushState(null, document.title, this._.currentUrl.toAbsolute());

        },

        _checkReady: function () {
            if (document.readyState === 'loading') {
                DOM.addListener(document, 'readystatechange', this._checkReady.bind(this));
                return;

            }

            if (!this._.setup) {
                this._.setup = true;

                window.setTimeout(function () {
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

            var transitionElms,
                removeElms,
                transition;

            if (elem) {
                transitionElms = this._getTransitionTargets(elem);
                removeElms = this._getRemoveTargets(elem);

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

        _checkRedirect: function (payload) {
            return !this._.options.whitelistRedirects !== !payload.allowAjax && Url.from(payload.redirect).isLocal();

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
            this._.flashMessages.add(null, 'error', 'There was an error processing your request. Please try again later.');

        }
    });

    _context.mixin(Service, SnippetHelpers);

    _context.register(Service, 'Service');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays',
    Url: 'Utils.Url'
});
