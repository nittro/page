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

        checkUrl: function(url, current) {
            if ((url + '').match(/^javascript:/)) {
                return false;
            }

            var u = url ? Url.from(url) : Url.fromCurrent(),
                c, d;

            if (this._.options.allowOrigins.indexOf(u.getOrigin()) === -1) {
                return false;
            }

            c = current ? Url.from(current) : Url.fromCurrent();
            d = u.compare(c);

            return d === 0 || d > Url.PART.HASH;

        },

        init: function(transaction, context) {
            return {
                request: this._.ajax.createRequest(transaction.getUrl(), context.method, context.data)
            };
        },

        dispatch: function(transaction, data) {
            return this._.ajax.dispatch(data.request)
                .then(this._handleResponse.bind(this, transaction, data));

        },

        abort: function(transaction, data) {
            data.request.abort();
        },

        handleAction: function(transaction, agent, action, actionData, data) {
            // may return promise
        },

        _handleResponse: function(transaction, data, response) {
            return transaction.dispatchAgentAction('ajax', 'response', response)
                .then(function() {
                    var payload = response.getPayload();

                    if (payload.postGet) {
                        transaction.setUrl(payload.url);
                    }

                    if ('redirect' in payload) {
                        if ((!this._.options.whitelistRedirects ? payload.allowAjax !== false : payload.allowAjax) && this.checkUrl(payload.redirect)) {
                            transaction.setUrl(payload.redirect);
                            data.request = this._.ajax.createRequest(payload.redirect);
                            return this.dispatch(transaction, data);

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
