_context.invoke('Nittro.Page', function (DOM, Arrays) {

    var location = window.history.location || window.location; // support for HTML5 history polyfill

    var History = _context.extend('Nittro.Object', function () {
        History.Super.call(this);
        this._.state = null;
        DOM.addListener(window, 'popstate', this._handleState.bind(this));
    }, {
        init: function () {
            if (window.history.state && window.history.state._nittro) {
                this._.state = window.history.state.data;
            } else {
                this._.state = {};
                this.update();
            }
        },

        push: function (url, title, data) {
            this._saveState(url, title, data, false);
        },

        replace: function (url, title, data) {
            this._saveState(url, title, data, true);
        },

        update: function (data) {
            Arrays.mergeTree(this._.state, data);
            window.history.replaceState({_nittro: true, data: this._.state}, document.title, location.href);
        },

        getState: function () {
            return this._.state;
        },

        _saveState: function (url, title, data, replace) {
            data = data || {};
            this.trigger('before-savestate', data);

            this._.state = data;

            if (replace) {
                window.history.replaceState({_nittro: true, data: data}, title || document.title, url);
            } else {
                window.history.pushState({_nittro: true, data: data}, title || document.title, url);
            }

            title && (document.title = title);

            this.trigger('savestate', {
                title: title,
                url: url,
                data: data,
                replace: replace
            });
        },

        _handleState: function (evt) {
            if (!evt.state || !evt.state._nittro) {
                return;
            }

            this._.state = evt.state.data;

            this.trigger('popstate', {
                title: document.title,
                url: location.href,
                data: evt.state.data
            });
        }
    });

    _context.register(History, 'History');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays'
});
