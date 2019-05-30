_context.invoke('Nittro.Page', function (DOM, Arrays) {

    var location = window.history.location || window.location; // support for HTML5 history polyfill

    var ScrollAgent = _context.extend(function (page, history, options) {
        this._ = {
            page: page,
            history: history,
            anchor: DOM.create('div'),
            options: Arrays.mergeTree({}, ScrollAgent.defaults, options)
        };

        this._.anchor.style.position = 'absolute';
        this._.anchor.style.left = 0;
        this._.anchor.style.top = 0;
        this._.anchor.style.width = '100%';
        this._.anchor.style.height = '1px';
        this._.anchor.style.marginTop = '-1px';

        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        this._.page.on('ready', this._init.bind(this));
        this._.page.on('transaction-created', this._initTransaction.bind(this));
    }, {
        STATIC: {
            defaults: {
                target: null,
                margin: 30,
                scrollDown: false,
                duration: 400
            }
        },

        _init: function () {
            var state = this._.history.getState(),
                target;

            if ('scrollAgent' in state) {
                target = state.scrollAgent.target;
            } else if (location.hash.match(/^#[^\s\[>+:.]+$/i)) {
                target = this._resolveSingleTarget(location.hash);
            }

            if (typeof target === 'number') {
                this._scrollTo(target, true, true);
            }
        },

        _initTransaction: function (evt) {
            if (evt.data.transaction.isBackground()) {
                return;
            }

            var rect = document.body.getBoundingClientRect(),
                data = {
                    previous: window.pageYOffset,
                    target: this._.options.target
                };

            this._.anchor.style.top = data.previous + rect.bottom + 'px';
            document.body.appendChild(this._.anchor);
            evt.data.transaction.on('dispatch', this._dispatch.bind(this, data));
            evt.data.transaction.on('abort error', this._cleanup.bind(this));
            evt.data.transaction.on('ajax-response', this._handleResponse.bind(this, data));
            evt.data.transaction.on('snippets-apply', this._handleSnippets.bind(this, data));
            evt.data.transaction.on('history-save', this._handleHistory.bind(this, data));

            if ('scrollTo' in evt.data.context) {
                data.target = evt.data.context.scrollTo;
            } else if (evt.data.context.element && evt.data.context.element.hasAttribute('data-scroll-to')) {
                data.target = DOM.getData(evt.data.context.element, 'scroll-to', null);
            }
        },

        _dispatch: function (data, evt) {
            var state = this._.history.getState();

            if (data.target === null && evt.target.isFromHistory() && state && 'scrollAgent' in state) {
                data.target = state.scrollAgent.target;
            }

            evt.target.then(this._apply.bind(this, data, evt.target), this._cleanup.bind(this));
        },

        _cleanup: function () {
            if (this._.anchor.parentNode) {
                this._.anchor.parentNode.removeChild(this._.anchor);
                this._.anchor.style.top = 0;
            }
        },

        _handleResponse: function (data, evt) {
            var payload = evt.data.response.getPayload();

            if ('scrollTo' in payload) {
                data.target = payload.scrollTo;
            }
        },

        _handleSnippets: function (data, evt) {
            if (data.target === null) {
                data.target = [];

                var id, params;

                for (id in evt.data.changeset.add) if (evt.data.changeset.add.hasOwnProperty(id)) {
                    params = evt.data.changeset.add[id];

                    if (!DOM.getData(params.container, 'scroll-ignore')) {
                        data.target.push('#' + id);
                    }
                }

                for (id in evt.data.changeset.update) if (evt.data.changeset.update.hasOwnProperty(id)) {
                    if (!DOM.getData(id, 'scroll-ignore')) {
                        data.target.push('#' + id);
                    }
                }
            }
        },

        _apply: function (data, transaction) {
            if (this._resolveTarget(data)) {
                this._scrollTo(data.target, transaction.isFromHistory());
            } else {
                this._cleanup();
            }
        },

        _scrollTo: function (to, force, instant) {
            var y0 = window.pageYOffset,
                dy = to - y0,
                t0 = Date.now(),
                dt = this._.options.duration,
                a = this._.anchor;

            if (force || this._.options.scrollDown || dy < 0) {
                if (instant) {
                    window.scrollTo(null, to);
                } else {
                    window.requestAnimationFrame(step);
                }
            } else {
                this._cleanup();
            }

            function step() {
                var x = (Date.now() - t0) / dt,
                    y;

                if (x <= 1) {
                    window.requestAnimationFrame(step);

                    y = y0 + dy * (-0.5 * Math.cos(Math.PI * x) + 0.5);
                    window.scrollTo(null, y);
                } else if (a.parentNode) {
                    a.parentNode.removeChild(a);
                    a.style.top = 0;
                }
            }
        },

        _handleHistory: function (data, evt) {
            this._.history.update({
                scrollAgent: {
                    target: data.previous
                }
            });

            this._resolveTarget(data);

            evt.data.state.scrollAgent = {
                target: data.target
            };
        },

        _resolveSingleTarget: function(target) {
            if (target === false) {
                return false;
            } else if (target === null) {
                return 0;
            } else if (typeof target === 'string') {
                if (target = DOM.find(target)[0]) {
                    return target.getBoundingClientRect().top + window.pageYOffset - this._.options.margin;
                } else {
                    return 0;
                }
            } else if (typeof target === 'number') {
                return target;
            } else {
                return false;
            }
        },

        _resolveTarget: function(data) {
            if (data.target === false) {
                return false;
            } else if (data.target === null) {
                data.target = 0;
            } else if (typeof data.target !== 'number') {
                if (Array.isArray(data.target)) {
                    data.target = data.target.join(',');
                }

                data.target = DOM.find(data.target).map(function (elem) {
                    return elem.getBoundingClientRect().top;
                });

                data.target = data.target.length
                    ? Math.min.apply(null, data.target) + window.pageYOffset - this._.options.margin
                    : 0;
            }

            return true;
        }
    });

    _context.register(ScrollAgent, 'ScrollAgent');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays'
});
