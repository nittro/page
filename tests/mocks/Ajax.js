_context.invoke('Mocks.Ajax', function () {

    var Request = _context.extend('Nittro.Ajax.Request', function (url, method, data) {
        Request.Super.call(this, url, method, data);

        this.response = new Response();

    }, {});

    var Response = _context.extend('Nittro.Ajax.Response', function () {
        Response.Super.call(this, 503, null, {});

        this.options = {
            fail: true,
            delay: false
        };
    }, {
        setResponse: function (status, payload, headers) {
            this._.status = status;
            this._.payload = payload;
            this._.headers = headers;
            return this;
        }
    });


    var Service = function () {
        this.listeners = [];
    };

    Service.prototype = {
        'get': function (url, data) {
            return this.dispatch(this.createRequest(url, 'GET', data));
        },

        post: function (url, data) {
            return this.dispatch(this.createRequest(url, 'POST', data));
        },

        createRequest: function (url, method, data) {
            var request = new Request(url, method, data);

            this.listeners.forEach(function (listener) {
                listener.call(null, request);
            });

            return request;

        },

        dispatch: function (request) {
            return new Promise(function (fulfill, reject) {
                var response = request.response;

                function resolve() {
                    if (response.options.fail) {
                        reject(response);
                    } else {
                        fulfill(response);
                    }
                }

                if (response.options.delay) {
                    window.setTimeout(resolve, response.options.delay);
                } else {
                    resolve();
                }
            }.bind(this));
        }
    };

    _context.register(Service, 'Service');

});
