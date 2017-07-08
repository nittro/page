_context.invoke('Nittro.Page.Bridges.PageDI', function (Nittro) {

    var PageExtension = _context.extend('Nittro.DI.BuilderExtension', function (containerBuilder, config) {
        PageExtension.Super.call(this, containerBuilder, config);
    }, {
        STATIC: {
            defaults: {
                whitelistHistory: false,
                whitelistLinks: false,
                whitelistRedirects: false,
                allowOrigins: null,
                backgroundErrors: false,
                csp: null,
                transitions: {
                    defaultSelector: '.nittro-transition-auto'
                },
                i18n: {
                    connectionError: 'There was an error connecting to the server. Please check your internet connection and try again.',
                    unknownError: 'There was an error processing your request. Please try again later.'
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
                        whitelistRedirects: config.whitelistRedirects,
                        allowOrigins: config.allowOrigins
                    }
                }
            });

            builder.addServiceDefinition('historyAgent', {
                factory: 'Nittro.Page.HistoryAgent()',
                args: {
                    options: {
                        whitelistHistory: config.whitelistHistory
                    }
                }
            });

            builder.addServiceDefinition('snippetAgent', 'Nittro.Page.SnippetAgent()');
            builder.addServiceDefinition('snippetManager', 'Nittro.Page.SnippetManager()');
            builder.addServiceDefinition('history', 'Nittro.Page.History()');
            builder.addServiceDefinition('googleAnalyticsHelper', 'Nittro.Page.GoogleAnalyticsHelper()!');

            if (config.transitions) {
                builder.addServiceDefinition('transitionAgent', {
                    factory: 'Nittro.Page.TransitionAgent()',
                    args: {
                        options: {
                            defaultSelector: config.transitions.defaultSelector
                        }
                    }
                });

                builder.getServiceDefinition('page')
                    .addSetup(function(transitionAgent) {
                        this.on('transaction-created', function(evt) {
                            transitionAgent.initTransaction(evt.data.transaction, evt.data.context);
                        });
                    });
            }

            if (config.csp !== false) {
                var nonce = document.getElementsByTagName('script').item(0).getAttribute('nonce') || null;

                if (config.csp || nonce) {
                    builder.addServiceDefinition('cspAgent', {
                        factory: 'Nittro.Page.CspAgent()',
                        args: {
                            nonce: nonce
                        }
                    });

                    builder.getServiceDefinition('page')
                        .addSetup(function(cspAgent) {
                            this.on('transaction-created', function(evt) {
                                cspAgent.initTransaction(evt.data.transaction);
                            });
                        });
                }
            }
        },

        setup: function() {
            var builder = this._getContainerBuilder(),
                config = this._getConfig();

            if (builder.hasServiceDefinition('flashes')) {
                builder.addServiceDefinition('flashAgent', 'Nittro.Page.Bridges.PageFlashes.FlashAgent()');

                builder.getServiceDefinition('page')
                    .addSetup(function(flashAgent) {
                        this.on('transaction-created', function(evt) {
                            flashAgent.initTransaction(evt.data.transaction);
                        });
                    })
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
