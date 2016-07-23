_context.invoke('Nittro.Page', function (DOM, Arrays) {

    var Transitions = _context.extend(function(duration) {
        this._ = {
            duration: duration || false,
            ready: true,
            queue: [],
            support: false
        };

        try {
            var s = DOM.create('span').style;

            this._.support = [
                'transition',
                'WebkitTransition',
                'MozTransition',
                'msTransition',
                'OTransition'
            ].some(function(prop) {
                return prop in s;
            });

            s = null;

        } catch (e) { }

    }, {
        transitionOut: function (elements) {
            return this._begin(elements, 'nittro-transition-out');

        },

        transitionIn: function (elements) {
            return this._begin(elements, 'nittro-transition-in');

        },

        _begin: function (elements, className) {
            if (!this._.support || !this._.duration || !elements.length) {
                return Promise.resolve(elements);

            } else {
                return this._resolve(elements, className);

            }
        },

        _resolve: function (elements, className) {
            if (!this._.ready) {
                return new Promise(function (fulfill) {
                    this._.queue.push([elements, className, fulfill]);

                }.bind(this));
            }

            this._.ready = false;

            if (className === 'nittro-transition-in') {
                var foo = window.pageXOffset; // needed to force layout and thus run asynchronously

            }

            DOM.addClass(elements, 'nittro-transition-active ' + className);
            DOM.removeClass(elements, 'nittro-transition-middle');

            var duration = this._getDuration(elements);

            var promise = new Promise(function (fulfill) {
                window.setTimeout(function () {
                    DOM.removeClass(elements, 'nittro-transition-active ' + className);

                    if (className === 'nittro-transition-out') {
                        DOM.addClass(elements, 'nittro-transition-middle');

                    }

                    this._.ready = true;

                    fulfill(elements);

                }.bind(this), duration);
            }.bind(this));

            promise.then(function () {
                if (this._.queue.length) {
                    var q = this._.queue.shift();

                    this._resolve(q[0], q[1]).then(function () {
                        q[2](q[0]);

                    });
                }
            }.bind(this));

            return promise;

        },

        _getDuration: function (elements) {
            if (!window.getComputedStyle) {
                return this._.duration;

            }

            var durations = DOM.getStyle(elements, 'animationDuration')
                .concat(DOM.getStyle(elements, 'transitionDuration'))
                .map(function(d) {
                    if (!d) {
                        return 0;
                    }

                    return Math.max.apply(null, d.split(/\s*,\s*/g).map(function(v) {
                        v = v.match(/^((?:\d*\.)?\d+)(m?s)$/);
                        return v ? parseFloat(v[1]) * (v[2] === 'ms' ? 1 : 1000) : 0;

                    }));
                });

            if (durations.length) {
                return Math.max.apply(null, durations);

            } else {
                return this._.duration;

            }
        }
    });

    _context.register(Transitions, 'Transitions');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays'
});
