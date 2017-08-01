_context.invoke('Mocks.Ajax', function () {

    var Request = _context.extend('Nittro.Ajax.Request', function (url, method, data, response) {
        Request.Super.call(this, url, method, data);

        response || (response = {});
        this.response = new Response();
        this.response.setResponse(response.status || 200, response.payload || {}, response.headers || {});
        this.setResponse(this.response);

    }, {});

    _context.register(Request, 'Request');

    var Response = _context.extend('Nittro.Ajax.Response', function () {
        Response.Super.call(this, 503, null, {});

        this.options = {
            fail: false,
            reason: null,
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
        this.requests = [];
    };

    Service.prototype = {
        'get': function (url, data) {
            return this.dispatch(this.createRequest(url, 'GET', data));
        },

        post: function (url, data) {
            return this.dispatch(this.createRequest(url, 'POST', data));
        },

        createRequest: function (url, method, data) {
            var request = this.requests.shift();

            if (!request) {
                request = new Request(url, method, data, {status: -1, payload: null, headers: {}});
                request.response.options.fail = true;
                request.response.options.reason = 'No mock request in queue';

            } else if (request.getUrl().compare(url)) {
                request.response.options.fail = true;
                request.response.options.reason = 'Invalid request url: ' + url;

            } else if (request.getMethod() !== (method || 'GET').toUpperCase()) {
                request.response.options.fail = true;
                request.response.options.reason = 'Invalid request method: ' + method;

            } else if (JSON.stringify(request.getData() || {}) !== JSON.stringify(data || {})) {
                request.response.options.fail = true;
                request.response.options.reason = 'Invalid request data';

            }

            return request;

        },

        dispatch: function (request) {
            function abort() {
                request.setRejected({
                    type: 'abort',
                    status: null,
                    request: request
                });
            }

            function resolve() {
                if (request.response.options.fail) {
                    request.setRejected(request.response);
                } else {
                    request.setFulfilled();
                }
            }

            request.setDispatched(abort);

            if (request.response.options.delay) {
                window.setTimeout(resolve, request.response.options.delay);
            } else {
                resolve();
            }

            return request;
        }
    };

    _context.register(Service, 'Service');

});
