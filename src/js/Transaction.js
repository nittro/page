_context.invoke('Nittro.Page', function(Url, undefined) {

    var Transaction = _context.extend('Nittro.Object', function (url) {
        Transaction.Super.call(this);

        this._.url = Url.from(url);
        this._.history = true;
        this._.agents = {};
        this._.data = {};

        this._.promise = new Promise(function(fulfill, reject) {
            this._.fulfill = fulfill;
            this._.reject = reject;
        }.bind(this));

    }, {
        add: function(name, agent) {
            this._.agents[name] = agent;
            return this;
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

        init: function (context) {
            for (var name in this._.agents) {
                if (this._.agents.hasOwnProperty(name)) {
                    this._.data[name] = this._.agents[name].init(this, context);
                }
            }

            return this;

        },

        dispatch: function() {
            var name, result, queue = [];

            for (name in this._.agents) {
                if (this._.agents.hasOwnProperty(name)) {
                    result = this._.agents[name].dispatch(this, this._.data[name]);

                    if (result) {
                        queue.push(result);
                    }
                }
            }

            if (queue.length) {
                Promise.all(queue).then(this._.fulfill.bind(this), this._.reject.bind(this));

            } else {
                this._.reject();

            }

            return this;

        },

        abort: function() {
            for (var name in this._.agents) {
                if (this._.agents.hasOwnProperty(name)) {
                    this._.agents[name].abort(this, this._.data[name]);
                }
            }

            this._.reject();

            return this;

        },

        then: function(onfulfilled, onrejected) {
            return this._.promise.then(onfulfilled, onrejected);
        },

        dispatchAgentAction: function(agent, action, data) {
            var name, result, queue = [];

            for (name in this._.agents) {
                if (name !== agent && this._.agents.hasOwnProperty(name)) {
                    result = this._.agents[name].handleAction(this, agent, action, data, this._.data[name]);

                    if (result) {
                        queue.push(result);
                    }
                }
            }

            return queue.length ? Promise.all(queue) : Promise.resolve();

        }
    });

    _context.register(Transaction, 'Transaction');

}, {
    Url: 'Utils.Url'
});
