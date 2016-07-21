_context.invoke('Nittro.Page.Bridges', function () {

    var PageDI = _context.extend('Nittro.DI.BuilderExtension', function (containerBuilder, config) {
        PageDI.Super.call(this, containerBuilder, config);
    }, {
        load: function () {
            var builder = this._getContainerBuilder(),
                config = this._getConfig();

            builder.addServiceDefinition('page', {
                factory: 'Nittro.Page.Service()',
                args: {
                    options: config
                },
                run: true
            });

            builder.addServiceDefinition('transitions', 'Nittro.Page.Transitions(300)');

        },

        setup: function() {
            var builder = this._getContainerBuilder();

            if (builder.hasServiceDefinition('formLocator')) {
                builder.getServiceDefinition('page')
                    .addSetup('::setFormLocator()');
            }

            if (builder.hasServiceDefinition('flashes')) {
                builder.getServiceDefinition('page')
                    .addSetup(function(flashes) {
                        this.on('flash', function(evt) {
                            evt.preventDefault();
                            flashes.add(null, evt.data.type, evt.data.message);
                        });
                    });
            }
        }
    });

    _context.register(PageDI, 'PageDI');

});
