_context.invoke('Nittro.Page', function(Arrays, DOM, Url) {

    var HistoryAgent = _context.extend(function(page, history, options) {
        this._ = {
            page: page,
            history: history,
            options: Arrays.mergeTree({}, HistoryAgent.defaults, options)
        };

        this._.page.on('transaction-created', this._initTransaction.bind(this));
    }, {
        STATIC: {
            defaults: {
                whitelistHistory: false
            }
        },

        _initTransaction: function (evt) {
            if (evt.data.context.fromHistory) {
                evt.data.transaction.setIsFromHistory();
            } else if ('history' in evt.data.context) {
                evt.data.transaction.setIsHistoryState(evt.data.context.history);
            } else if (evt.data.context.element) {
                evt.data.transaction.setIsHistoryState(DOM.getData(evt.data.context.element, 'history', !this._.options.whitelistHistory));
            } else {
                evt.data.transaction.setIsHistoryState(!this._.options.whitelistHistory);
            }

            var data = {
                title: document.title
            };

            evt.data.transaction.on('dispatch', this._dispatch.bind(this, data));
            evt.data.transaction.on('ajax-response', this._handleResponse.bind(this, data));
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
                data.state = {};

                if (!transaction.trigger('history-save', data).isDefaultPrevented()) {
                    this._.history.push(transaction.getUrl().toAbsolute(), data.title, data.state);
                }
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
