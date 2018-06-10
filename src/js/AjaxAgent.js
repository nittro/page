_context.invoke('Nittro.Page', function(Arrays) {

    var AjaxAgent = _context.extend(function(page, ajax, options) {
        this._ = {
            page: page,
            ajax: ajax,
            options: Arrays.mergeTree({}, AjaxAgent.defaults, options)
        };

        this._.page.on('before-transaction', this._checkTransaction.bind(this));
        this._.page.on('transaction-created', this._initTransaction.bind(this));
    }, {
        STATIC: {
            defaults: {
                whitelistRedirects: false
            }
        },

        _checkTransaction: function (evt) {
            if (!this._.ajax.isAllowedOrigin(evt.data.url) || !this._.ajax.supports(evt.data.url, evt.data.context.method, evt.data.context.data)) {
                evt.preventDefault();
            }
        },

        _initTransaction: function(evt) {
            var data = {
                request: this._.ajax.createRequest(evt.data.transaction.getUrl(), evt.data.context.method, evt.data.context.data)
            };

            evt.data.transaction.on('dispatch', this._dispatch.bind(this, data));
            evt.data.transaction.on('abort', this._abort.bind(this, data));
        },

        _dispatch: function(data, evt) {
            evt.waitFor(Promise.resolve().then(this._doDispatch.bind(this, evt.target, data)));
        },

        _doDispatch: function (transaction, data) {
            return transaction.trigger('ajax-request', { request: data.request })
                .then(this._.ajax.dispatch.bind(this._.ajax, data.request))
                .then(this._handleResponse.bind(this, transaction, data));
        },

        _abort: function(data) {
            data.request.abort();
        },

        _handleResponse: function (transaction, data, response) {
            return Promise.resolve().then(this._doHandleResponse.bind(this, transaction, data, response));
        },

        _doHandleResponse: function(transaction, data, response) {
            return transaction.trigger('ajax-response', { response: response })
                .then(function() {
                    var payload = response.getPayload();

                    if (payload.postGet) {
                        transaction.setUrl(payload.url);
                    }

                    if ('redirect' in payload) {
                        if ((!this._.options.whitelistRedirects ? payload.allowAjax !== false : payload.allowAjax) && this._.ajax.isAllowedOrigin(payload.redirect)) {
                            transaction.setUrl(payload.redirect);
                            data.request = this._.ajax.createRequest(payload.redirect);
                            return this._doDispatch(transaction, data);

                        } else {
                            document.location.href = payload.redirect;
                            return new Promise(function() {});
                        }
                    } else {
                        return data.request;
                    }
                }.bind(this));
        }
    });

    _context.register(AjaxAgent, 'AjaxAgent');

}, {
    Arrays: 'Utils.Arrays'
});
