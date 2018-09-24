_context.invoke('Nittro.Page.Bridges.PageDI', function (Nittro) {

    var PageExtension = _context.extend('Nittro.DI.BuilderExtension', function (containerBuilder, config) {
        PageExtension.Super.call(this, containerBuilder, config);
    }, {
        STATIC: {
            defaults: {
                whitelistHistory: false,
                whitelistLinks: false,
                whitelistRedirects: false,
                backgroundErrors: false,
                csp: null,
                transitions: {
                    defaultSelector: '.nittro-transition-auto'
                },
                i18n: {
                    connectionError: 'There was an error connecting to the server. Please check your internet connection and try again.',
                    unknownError: 'There was an error processing your request. Please try again later.'
                },
                scroll: {
                    target: null,
                    margin: 30,
                    scrollDown: false,
                    duration: 500
                }
            }
        },
        load: function () {
            var builder = this._getContainerBuilder(),
                config = this._getConfig(PageExtension.defaults);

            builder.addServiceDefinition('page', {
                factory: 'Nittro.Page.Service()',
                args: {
                    options: {
                        whitelistLinks: config.whitelistLinks,
                        backgroundErrors: config.backgroundErrors
                    }
                },
                run: true
            });

            builder.addServiceDefinition('ajaxAgent', {
                factory: 'Nittro.Page.AjaxAgent()',
                args: {
                    options: {
                        whitelistRedirects: config.whitelistRedirects
                    }
                },
                run: true
            });

            builder.addServiceDefinition('historyAgent', {
                factory: 'Nittro.Page.HistoryAgent()',
                args: {
                    options: {
                        whitelistHistory: config.whitelistHistory
                    }
                },
                run: true
            });

            builder.addServiceDefinition('scrollAgent', {
                factory: 'Nittro.Page.ScrollAgent()',
                args: {
                    options: config.scroll
                },
                run: true
            });

            builder.addServiceDefinition('snippetAgent', 'Nittro.Page.SnippetAgent()!');
            builder.addServiceDefinition('snippetManager', 'Nittro.Page.SnippetManager()');
            builder.addServiceDefinition('history', 'Nittro.Page.History()');

            if (typeof window.ga === 'function') {
                builder.addServiceDefinition('googleAnalyticsHelper', 'Nittro.Page.GoogleAnalyticsHelper()!');
            }

            if (config.transitions) {
                builder.addServiceDefinition('transitionAgent', {
                    factory: 'Nittro.Page.TransitionAgent()',
                    args: {
                        options: {
                            defaultSelector: config.transitions.defaultSelector
                        }
                    },
                    run: true
                });
            }

            if (config.csp !== false) {
                var scripts = document.getElementsByTagName('script'),
                    i, n, nonce = null;

                for (i = 0, n = scripts.length; i < n; i++) {
                    if (/^((text|application)\/javascript)?$/i.test(scripts.item(i).type) && scripts.item(i).nonce) {
                        nonce = scripts.item(i).nonce;
                        break;
                    }
                }

                if (config.csp || nonce) {
                    builder.addServiceDefinition('cspAgent', {
                        factory: 'Nittro.Page.CspAgent()',
                        args: {
                            nonce: nonce
                        },
                        run: true
                    });
                }
            }
        },

        setup: function() {
            var builder = this._getContainerBuilder(),
                config = this._getConfig();

            if (builder.hasServiceDefinition('flashes')) {
                builder.addServiceDefinition('flashAgent', 'Nittro.Page.Bridges.PageFlashes.FlashAgent()!');

                builder.getServiceDefinition('page')
                    .addSetup(function(flashes) {
                        this.on('error:default', function (evt) {
                            if (evt.data.type === 'connection') {
                                flashes.add(config.i18n.connectionError, 'error');

                            } else if (evt.data.type !== 'abort') {
                                flashes.add(config.i18n.unknownError, 'error');

                            }
                        });
                    });
            }
        }
    });

    _context.register(PageExtension, 'PageExtension');

});
