_context.invoke('Nittro.Page', function (DOM, Arrays, CSSTransitions, undefined) {

    var TransitionAgent = _context.extend('Nittro.Object', function(page, options) {
        TransitionAgent.Super.call(this);

        this._.page = page;
        this._.options = Arrays.mergeTree({}, TransitionAgent.defaults, options);

        this._.page.on('transaction-created', this._initTransaction.bind(this));
    }, {
        STATIC: {
            defaults: {
                defaultSelector: '.nittro-transition-auto'
            }
        },

        _initTransaction: function(evt) {
            var data = {
                elements: this._getTransitionTargets(evt.data.context),
                removeTargets: this._getRemoveTargets(evt.data.context)
            };

            evt.data.transaction.on('dispatch', this._dispatch.bind(this, data));
            evt.data.transaction.on('abort', this._abort.bind(this, data));
            evt.data.transaction.on('snippets-apply', this._handleSnippets.bind(this, data));
        },

        _dispatch: function(data, evt) {
            evt.target.on('error', this._handleError.bind(this, data));
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

        _handleError: function (data, evt) {
            if (data.transitionOut) {
                evt.waitFor(data.transitionOut);
            }
        },

        _transitionOut: function (data) {
            return this._transition(data.elements.concat(data.removeTargets), 'out');
        },

        _transitionIn: function (data, aborting) {
            var elements = aborting ? data.elements.concat(data.removeTargets) : data.elements;

            if (elements.length) {
                return this._transition(elements, 'in')
                    .then(function () {
                        DOM.removeClass(elements, 'nittro-dynamic-add', 'nittro-dynamic-remove');
                    });

            }
        },

        _transition: function(elements, dir) {
            return CSSTransitions.run(elements, {
                    add: 'nittro-transition-active nittro-transition-' + dir,
                    remove: 'nittro-transition-middle',
                    after: dir === 'out' ? 'nittro-transition-middle' : null
                }, dir === 'in');
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
