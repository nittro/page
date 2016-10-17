_context.invoke('Nittro.Page', function (DOM) {

    var TransitionHelper = _context.extend(function() {
        this._ = {
            support: !!window.getComputedStyle
        };

        if (this._.support) try {
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
        transition: function(elements, classes, forceLayout) {
            if (!this._.support || !elements.length) {
                return Promise.resolve(elements);

            } else {
                return this._resolve(elements, classes, forceLayout);

            }
        },

        _resolve: function (elements, classes, forceLayout) {
            if (forceLayout) {
                var foo = window.pageXOffset; // needed to force layout and thus run asynchronously

            }

            classes.add && DOM.addClass(elements, classes.add);
            classes.remove && DOM.removeClass(elements, classes.remove);

            var duration = this._getDuration(elements);

            return new Promise(function (fulfill) {
                window.setTimeout(function () {
                    classes.add && DOM.removeClass(elements, classes.add);
                    classes.after && DOM.addClass(elements, classes.after);
                    fulfill(elements);

                }.bind(this), duration);
            }.bind(this));
        },

        _getDuration: function (elements) {
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

            return durations.length ? Math.max.apply(null, durations) : 0;

        }
    });

    _context.register(TransitionHelper, 'TransitionHelper');

}, {
    DOM: 'Utils.DOM'
});
