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

            evt.data.transaction.on('dispatch', function(evt) { evt.waitFor(this._dispatch(evt.target, data)); }.bind(this));
            evt.data.transaction.on('abort', this._abort.bind(this, data));
        },

        _dispatch: function(transaction, data) {
            return transaction.trigger('ajax-request', { request: data.request })
                .then(this._.ajax.dispatch.bind(this._.ajax, data.request))
                .then(this._handleResponse.bind(this, transaction, data));
        },

        _abort: function(data) {
            data.request.abort();
        },

        _handleResponse: function(transaction, data, response) {
            return transaction.trigger('ajax-response', { response: response })
                .then(function() {
                    var payload = response.getPayload();

                    if (payload.postGet) {
                        transaction.setUrl(payload.url);
                    }

                    if ('redirect' in payload) {
                        if ((!this._.options.whitelistRedirects ? payload.allowAjax !== false : payload.allowAjax) && this.checkUrl(payload.redirect)) {
                            transaction.setUrl(payload.redirect);
                            data.request = this._.ajax.createRequest(payload.redirect);
                            return this._dispatch(transaction, data);

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
    Arrays: 'Utils.Arrays'
});
