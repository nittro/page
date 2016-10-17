_context.invoke('Nittro.Page', function(Arrays, DOM, Url) {

    var HistoryAgent = _context.extend(function(options) {
        this._ = {
            options: Arrays.mergeTree({}, HistoryAgent.defaults, options)
        };
    }, {
        STATIC: {
            defaults: {
                whitelistHistory: false
            }
        },

        init: function (transaction, context) {
            if ('history' in context) {
                transaction.setIsHistoryState(context.history);

            } else if (context.element) {
                transaction.setIsHistoryState(this._.options.whitelistHistory ? DOM.hasClass(context.element, 'nittro-history') : !DOM.hasClass(context.element, 'nittro-no-history'));

            } else {
                transaction.setIsHistoryState(!this._.options.whitelistHistory);

            }

            return {
                title: document.title
            };
        },

        dispatch: function (transaction, data) {
            transaction.then(this._saveState.bind(this, transaction, data));
        },

        abort: function (transaction, data) {

        },

        handleAction: function (transaction, agent, action, actionData, data) {
            if (agent === 'ajax' && action === 'response') {
                var payload = actionData.getPayload();

                if (payload.title) {
                    data.title = payload.title;
                }
            }
        },

        _saveState: function (transaction, data) {
            if (transaction.getUrl().getOrigin() !== Url.fromCurrent().getOrigin()) {
                transaction.setIsHistoryState(false);

            } else if (transaction.isHistoryState()) {
                window.history.pushState({_nittro: true}, data.title, transaction.getUrl().toAbsolute());
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
