_context.invoke('Nittro.Page', function(Arrays, DOM, Url) {

    var HistoryAgent = _context.extend(function(history, options) {
        this._ = {
            history: history,
            options: Arrays.mergeTree({}, HistoryAgent.defaults, options)
        };
    }, {
        STATIC: {
            defaults: {
                whitelistHistory: false
            }
        },

        initTransaction: function (transaction, context) {
            if ('history' in context) {
                transaction.setIsHistoryState(context.history);
            } else if (context.element) {
                transaction.setIsHistoryState(DOM.getData(context.element, 'history', !this._.options.whitelistHistory));
            } else {
                transaction.setIsHistoryState(!this._.options.whitelistHistory);
            }

            var data = {
                title: document.title
            };

            transaction.on('dispatch', this._dispatch.bind(this, data));
            transaction.on('ajax-response', this._handleResponse.bind(this, data));
        },

        _dispatch: function (data, evt) {
            evt.target.then(this._saveState.bind(this, evt.target, data), function () { /* noop on transaction error */ });
        },

        _handleResponse: function (data, evt) {
            var payload = evt.data.response.getPayload();

            if (payload.title) {
                data.title = payload.title;
            }
        },

        _saveState: function (transaction, data) {
            if (transaction.getUrl().getOrigin() !== Url.fromCurrent().getOrigin() || transaction.isBackground()) {
                transaction.setIsHistoryState(false);

            } else if (transaction.isHistoryState()) {
                this._.history.push(transaction.getUrl().toAbsolute(), data.title);

            }

            if (data.title) {
                document.title = data.title;
            }
        }
    });

    _context.register(HistoryAgent, 'HistoryAgent');

}, {
    Arrays: 'Utils.Arrays',
    DOM: 'Utils.DOM',
    Url: 'Utils.Url'
});
