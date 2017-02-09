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

        init: function(transaction, context) {
            return {
                elements: this._getTransitionTargets(context.element),
                removeTargets: context.element ? this._getRemoveTargets(context.element) : []
            };
        },

        dispatch: function(transaction, data) {
            transaction.then(this._transitionIn.bind(this, data, false), this._transitionIn.bind(this, data, true));

            if (data.elements.length || data.removeTargets.length) {
                DOM.addClass(data.removeTargets, 'nittro-dynamic-remove');
                return data.transitionOut = this._transitionOut(data);

            }
        },

        abort: function(transaction, data) {
            if (data.elements.length || data.removeTargets.length) {
                this._transitionIn(data, true);

            }
        },

        handleAction: function(transaction, agent, action, actionData, data) {
            if (agent === 'snippets' && action === 'apply-changes') {
                for (var id in actionData.add) {
                    if (actionData.add.hasOwnProperty(id)) {
                        DOM.addClass(actionData.add[id].content, 'nittro-dynamic-add', 'nittro-transition-middle');
                        data.elements.push(actionData.add[id].content);

                    }
                }

                return data.transitionOut;

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

        _getTransitionTargets: function(elem) {
            var sel = elem ? DOM.getData(elem, 'transition') : undefined,
                targets;

            if (sel === undefined && (!elem || !DOM.getData(elem, 'dynamic-remove'))) {
                sel = this._.options.defaultSelector;

            }

            targets = sel ? DOM.find(sel) : [];

            this.trigger('prepare-transition-targets', {
                element: elem,
                targets: targets
            });

            return targets;

        },

        _getRemoveTargets: function (elem) {
            var sel = DOM.getData(elem, 'dynamic-remove'),
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
