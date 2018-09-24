_context.invoke('Nittro.Page', function(Url) {

    var Transaction = _context.extend('Nittro.Object', function (url) {
        Transaction.Super.call(this);

        this._.url = Url.from(url);
        this._.history = true;
        this._.fromHistory = false;
        this._.background = false;

        this._.promise = new Promise(function(fulfill, reject) {
            this._.fulfill = fulfill;
            this._.reject = reject;
        }.bind(this));
    }, {
        STATIC: {
            createRejected: function (url, reason) {
                var self = new Transaction(url);
                self._.reject(reason);
                return self;
            }
        },

        getUrl: function() {
            return this._.url;
        },

        setUrl: function(url) {
            this._.url = Url.from(url);
            return this;
        },

        isHistoryState: function() {
            return this._.history;
        },

        setIsHistoryState: function(value) {
            this._.history = value;
            return this;
        },

        isFromHistory: function() {
            return this._.fromHistory;
        },

        setIsFromHistory: function() {
            this._.fromHistory = true;
            this._.history = false;
        },

        isBackground: function() {
            return this._.background;
        },

        setIsBackground: function(value) {
            this._.background = value;
            return this;
        },

        dispatch: function() {
            this.trigger('dispatch')
                .then(this._.fulfill, this._handleError.bind(this));

            return this;
        },

        abort: function() {
            this._.reject({type: 'abort'});
            this.trigger('abort');
            return this;
        },

        then: function(onfulfilled, onrejected) {
            return this._.promise.then(onfulfilled, onrejected);
        },

        _handleError: function (err) {
            this.trigger('error')
                .then(function () {
                    this._.reject(err);
                }.bind(this));
        }
    });

    _context.register(Transaction, 'Transaction');

}, {
    Url: 'Utils.Url'
});
