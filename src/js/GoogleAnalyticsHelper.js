_context.invoke('Nittro.Page', function (Url) {

    var GoogleAnalyticsHelper = _context.extend(function (history) {
        this._ = {
            history: history
        };

        this._.history.on('savestate popstate', this._handleState.bind(this));
    }, {
        _handleState: function (evt) {
            if (typeof window.ga === 'function' && !evt.data.replace) {
                window.ga('set', {
                    page: Url.from(evt.data.url).setHash(null).toLocal(),
                    title: evt.data.title
                });

                window.ga('send', 'pageview');
            }
        }
    });

    _context.register(GoogleAnalyticsHelper, 'GoogleAnalyticsHelper');

}, {
    Url: 'Utils.Url'
});
