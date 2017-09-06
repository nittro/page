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
                whitelistLinks: false,
                backgroundErrors: false
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
                    return this._createRejectedTransaction(url, {type: 'abort'});
                }

                context.event && context.event.preventDefault();

                return evt.then(function () {
                    if (evt.isDefaultPrevented()) {
                        return this._createRejectedTransaction(url, {type: 'abort'});
                    } else {
                        return this._createTransaction(url, context);
                    }
                }.bind(this));
            } catch (e) {
                return this._createRejectedTransaction(url, e);
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

            this.open(url, 'get', null, {history: false})
                .then(null, function () {
                    document.location.href = url.toAbsolute();
                });
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

        _createTransaction: function(url, context) {
            var transaction = new Transaction(url);

            this._initTransaction(transaction, context);
            this._.ajaxAgent.initTransaction(transaction, context);
            this._.snippetAgent.initTransaction(transaction, context);
            this._.historyAgent.initTransaction(transaction, context);

            this.trigger('transaction-created', {
                transaction: transaction,
                context: context
            });

            return this._dispatchTransaction(transaction);

        },

        _createRejectedTransaction: function (url, reason) {
            var transaction = Transaction.createRejected(url, reason);
            return transaction.then(null, this._handleError.bind(this, transaction));
        },

        _initTransaction: function (transaction, context) {
            if ('background' in context) {
                transaction.setIsBackground(context.background);
            } else if (context.element) {
                transaction.setIsBackground(DOM.getData(context.element, 'background', false));
            }
        },

        _dispatchTransaction: function(transaction) {
            if (!transaction.isBackground()) {
                if (this._.currentTransaction) {
                    this._.currentTransaction.abort();
                }

                this._.currentTransaction = transaction;
            }

            return transaction.dispatch().then(
                this._handleSuccess.bind(this, transaction),
                this._handleError.bind(this, transaction)
            );
        },

        _checkUrl: function(url, current, ignoreHash) {
            return this._.ajaxAgent.checkUrl(url, current, ignoreHash);
        },

        _checkLink: function (link) {
            return !link.hasAttribute('target') && link.hasAttribute('href') && DOM.getData(link, 'ajax', !this._.options.whitelistLinks);
        },

        _handleSuccess: function(transaction) {
            if (!transaction.isBackground()) {
                this._.currentTransaction = null;
            }

            if (transaction.isHistoryState()) {
                this._.currentUrl = transaction.getUrl();
            }
        },

        _handleError: function (transaction, err) {
            if (transaction === this._.currentTransaction) {
                this._.currentTransaction = null;
            }

            if (!transaction.isBackground() || this._.options.backgroundErrors) {
                this.trigger('error', err);
            }
        }
    });

    _context.register(Service, 'Service');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays',
    Url: 'Utils.Url'
});
