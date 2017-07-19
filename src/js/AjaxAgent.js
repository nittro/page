_context.invoke('Nittro.Page', function(Arrays, Url) {

    var AjaxAgent = _context.extend(function(ajax, options) {
        this._ = {
            ajax: ajax,
            options: Arrays.mergeTree({}, AjaxAgent.defaults, options)
        };

        if (!this._.options.allowOrigins) {
            this._.options.allowOrigins = [];
        } else if (!Array.isArray(this._.options.allowOrigins)) {
            this._.options.allowOrigins = this._.options.allowOrigins.split(/\s*,\s*/g);
        }

        this._.options.allowOrigins.push(Url.fromCurrent().getOrigin());

    }, {
        STATIC: {
            defaults: {
                whitelistRedirects: false,
                allowOrigins: null
            }
        },

        checkUrl: function(url, current, ignoreHash) {
            if ((url + '').match(/^(?!https?)[^:\/?#]+:/i)) {
                return false;
            }

            var u = url ? Url.from(url) : Url.fromCurrent(),
                c, d;

            if (this._.options.allowOrigins.indexOf(u.getOrigin()) === -1) {
                return false;
            }

            if (ignoreHash) {
                return true;
            }

            c = current ? Url.from(current) : Url.fromCurrent();
            d = u.compare(c);

            return d !== Url.PART.HASH;

        },

        initTransaction: function(transaction, context) {
            var data = {
                request: this._.ajax.createRequest(transaction.getUrl(), context.method, context.data)
            };

            transaction.on('dispatch', function(evt) { evt.waitFor(this._dispatch(transaction, data)); }.bind(this));
            transaction.on('abort', this._abort.bind(this, data));
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
    Arrays: 'Utils.Arrays',
    Url: 'Utils.Url'
});
