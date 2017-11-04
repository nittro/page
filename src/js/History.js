_context.invoke('Nittro.Page', function (DOM) {

    var location = window.history.location || window.location; // support for HTML5 history polyfill

    var History = _context.extend('Nittro.Object', function () {
        History.Super.call(this);
        DOM.addListener(window, 'popstate', this._handleState.bind(this));

    }, {
        push: function (url, title, data) {
            data || (data = {});

            this.trigger('before-savestate', data);

            window.history.pushState({_nittro: true, data: data}, title || document.title, url);
            title && (document.title = title);

            this.trigger('savestate', {
                title: title,
                url: url,
                data: data
            });
        },

        replace: function (url, title, data) {
            data || (data = {});

            this.trigger('before-savestate', data);

            window.history.replaceState({_nittro: true, data: data}, title || document.title, url);
            title && (document.title = title);

            this.trigger('savestate', {
                title: title,
                url: url,
                data: data,
                replace: true
            });
        },

        _handleState: function (evt) {
            if (!evt.state || !evt.state._nittro) {
                return;
            }

            this.trigger('popstate', {
                title: document.title,
                url: location.href,
                data: evt.state.data
            });
        }
    });

    _context.register(History, 'History');

}, {
    DOM: 'Utils.DOM'
});
