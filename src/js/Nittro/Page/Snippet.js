_context.invoke('Nittro.Page', function (DOM, undefined) {

    var Snippet = _context.extend(function (id, state) {
        this._ = {
            id: id,
            container: false,
            state: typeof state === 'number' ? state : Snippet.INACTIVE,
            data: {},
            handlers: [
                [], [], [], []
            ]
        };
    }, {
        STATIC: {
            INACTIVE: -1,
            PREPARE_SETUP: 0,
            RUN_SETUP: 1,
            PREPARE_TEARDOWN: 2,
            RUN_TEARDOWN: 3
        },

        getId: function () {
            return this._.id;

        },

        setup: function (prepare, run) {
            if (prepare && !run) {
                run = prepare;
                prepare = null;

            }

            if (prepare) {
                if (this._.state === Snippet.PREPARE_SETUP) {
                    prepare(this.getElement());

                } else {
                    this._.handlers[Snippet.PREPARE_SETUP].push(prepare);

                }
            }

            if (run) {
                if (this._.state === Snippet.RUN_SETUP) {
                    run(this.getElement());

                } else {
                    this._.handlers[Snippet.RUN_SETUP].push(run);

                }
            }

            return this;

        },

        teardown: function (prepare, run) {
            if (prepare && !run) {
                run = prepare;
                prepare = null;

            }

            if (prepare) {
                if (this._.state === Snippet.PREPARE_TEARDOWN) {
                    prepare(this.getElement());

                } else {
                    this._.handlers[Snippet.PREPARE_TEARDOWN].push(prepare);

                }
            }

            if (run) {
                if (this._.state === Snippet.RUN_TEARDOWN) {
                    run(this.getElement());

                } else {
                    this._.handlers[Snippet.RUN_TEARDOWN].push(run);

                }
            }

            return this;

        },

        setState: function (state) {
            if (state === Snippet.INACTIVE) {
                this._.state = state;

                this._.handlers.forEach(function (queue) {
                    queue.splice(0, queue.length);

                });

            } else if (state - 1 === this._.state) {
                this._.state = state;

                var elm = this.getElement();

                this._.handlers[this._.state].forEach(function (handler) {
                    handler(elm);

                });

                this._.handlers[this._.state].splice(0, this._.handlers[this._.state].length);

            }

            return this;

        },

        getState: function () {
            return this._.state;

        },

        getData: function (key, def) {
            return key in this._.data ? this._.data[key] : (def === undefined ? null : def);

        },

        setData: function (key, value) {
            this._.data[key] = value;
            return this;

        },

        setContainer: function () {
            this._.container = true;
            return this;

        },

        isContainer: function () {
            return this._.container;

        },

        getElement: function () {
            return DOM.getById(this._.id);

        }
    });

    _context.register(Snippet, 'Snippet');

}, {
    DOM: 'Utils.DOM'
});
