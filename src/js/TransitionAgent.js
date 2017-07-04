_context.invoke('Nittro.Page', function (DOM, Arrays, CSSTransitions, undefined) {

    var TransitionAgent = _context.extend('Nittro.Object', function(options) {
        TransitionAgent.Super.call(this);

        this._.ready = true;
        this._.queue = [];
        this._.options = Arrays.mergeTree({}, TransitionAgent.defaults, options);

    }, {
        STATIC: {
            defaults: {
                defaultSelector: '.nittro-transition-auto'
            }
        },

        initTransaction: function(transaction, context) {
            var data = {
                elements: this._getTransitionTargets(context),
                removeTargets: this._getRemoveTargets(context)
            };

            transaction.on('dispatch', this._dispatch.bind(this, data));
            transaction.on('abort', this._abort.bind(this, data));
            transaction.on('snippets-apply', this._handleSnippets.bind(this, data));
        },

        _dispatch: function(data, evt) {
            evt.target.then(this._transitionIn.bind(this, data, false), this._transitionIn.bind(this, data, true));

            if (data.elements.length || data.removeTargets.length) {
                DOM.addClass(data.removeTargets, 'nittro-dynamic-remove');
                data.transitionOut = this._transitionOut(data);
                evt.waitFor(data.transitionOut);
            }
        },

        _abort: function(data) {
            if (data.elements.length || data.removeTargets.length) {
                this._transitionIn(data, true);
            }
        },

        _handleSnippets: function(data, evt) {
            var changeset = evt.data.changeset,
                id;

            for (id in changeset.add) {
                if (changeset.add.hasOwnProperty(id)) {
                    DOM.addClass(changeset.add[id].content, 'nittro-dynamic-add', 'nittro-transition-middle');
                    data.elements.push(changeset.add[id].content);

                }
            }

            if (data.transitionOut) {
                evt.waitFor(data.transitionOut);
            }
        },

        _transitionOut: function (data) {
            return this._enqueue(data.elements.concat(data.removeTargets), 'out');

        },

        _transitionIn: function (data, aborting) {
            var elements = aborting ? data.elements.concat(data.removeTargets) : data.elements;

            if (elements.length) {
                return this._enqueue(elements, 'in')
                    .then(function () {
                        DOM.removeClass(elements, 'nittro-dynamic-add', 'nittro-dynamic-remove');
                    });

            }
        },

        _enqueue: function (elements, dir) {
            if (!this._.ready) {
                return new Promise(function (fulfill) {
                    this._.queue.push([elements, dir, fulfill]);

                }.bind(this));
            }

            this._.ready = false;
            return this._transition(elements, dir);

        },

        _transition: function(elements, dir) {
            return CSSTransitions.run(elements, {
                    add: 'nittro-transition-active nittro-transition-' + dir,
                    remove: 'nittro-transition-middle',
                    after: dir === 'out' ? 'nittro-transition-middle' : null
                }, dir === 'in')
                .then(function () {
                    if (this._.queue.length) {
                        var q = this._.queue.shift();

                        this._transition(q[0], q[1]).then(function () {
                            q[2](q[0]);

                        });
                    } else {
                        this._.ready = true;

                    }
                }.bind(this));
        },

        _getTransitionTargets: function(context) {
            var sel, targets;

            if (context.transition !== undefined) {
                sel = context.transition;
            } else {
                sel = context.element ? DOM.getData(context.element, 'transition') : undefined;
            }

            if (sel === undefined && (!context.element || !DOM.getData(context.element, 'dynamic-remove'))) {
                sel = this._.options.defaultSelector;
            }

            targets = sel ? DOM.find(sel) : [];

            this.trigger('prepare-transition-targets', {
                element: context.element,
                targets: targets
            });

            return targets;

        },

        _getRemoveTargets: function (context) {
            if (!context.element) {
                return [];
            }

            var sel = DOM.getData(context.element, 'dynamic-remove'),
                targets = sel ? DOM.find(sel) : [];

            if (targets.length) {
                this.trigger('prepare-remove-targets', {
                    targets: targets.slice()
                });
            }

            return targets;

        }
    });

    _context.register(TransitionAgent, 'TransitionAgent');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays',
    CSSTransitions: 'Utils.CSSTransitions'
});
