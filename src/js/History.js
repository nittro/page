_context.invoke('Nittro.Page', function (DOM) {

    var location = window.history.location || window.location; // support for HTML5 history polyfill

    var History = _context.extend('Nittro.Object', function () {
        History.Super.call(this);
        DOM.addListener(window, 'popstate', this._handleState.bind(this));

    }, {
        push: function (url, title) {
            window.history.pushState({_nittro: true}, title || document.title, url);
            title && (document.title = title);

            this.trigger('savestate', {
                title: title,
                url: url
            });
        },

        replace: function (url, title) {
            window.history.replaceState({_nittro: true}, title || document.title, url);
            title && (document.title = title);

            this.trigger('savestate', {
                title: title,
                url: url,
                replace: true
            });
        },

        _handleState: function (evt) {
            if (evt.state === null) {
                return;
            }

            this.trigger('popstate', {
                title: document.title,
                url: location.href
            });
        }
    });

    _context.register(History, 'History');

}, {
    DOM: 'Utils.DOM'
});
