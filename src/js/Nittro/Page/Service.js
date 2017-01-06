_context.invoke('Nittro.Page', function (Transaction, DOM, Arrays, Url) {

    var Service = _context.extend('Nittro.Object', function (ajaxAgent, snippetAgent, historyAgent, snippetManager, history, options) {
        Service.Super.call(this);

        this._.ajaxAgent = ajaxAgent;
        this._.snippetAgent = snippetAgent;
        this._.historyAgent = historyAgent;
        this._.snippetManager = snippetManager;
        this._.history = history;
        this._.options = Arrays.mergeTree({}, Service.defaults, options);
        this._.setup = false;
        this._.currentTransaction = null;
        this._.currentUrl = Url.fromCurrent();

        this._.history.on('popstate', this._handleState.bind(this));
        DOM.addListener(document, 'click', this._handleLinkClick.bind(this));

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

                var evt = this.trigger('before-transaction', {
                    url: url,
                    context: context
                });

                if (evt.isDefaultPrevented()) {
                    return Promise.reject();
                }

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
            if (!this._checkUrl(null, this._.currentUrl)) {
                return;

            }

            var url = Url.from(evt.data.url);
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
                    this._.history.replace((window.history.location || window.location).href);
                    this._.snippetManager.setup();

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

            return DOM.getData(link, 'ajax', !this._.options.whitelistLinks);

        },

        _handleSuccess: function(transaction) {
            this._.currentTransaction = null;

            if (transaction.isHistoryState()) {
                this._.currentUrl = transaction.getUrl();

            }
        },

        _handleError: function (err) {
            this._.currentTransaction = null;
            this.trigger('error', err);
        }
    });

    _context.register(Service, 'Service');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays',
    Url: 'Utils.Url'
});
