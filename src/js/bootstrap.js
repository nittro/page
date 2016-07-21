_context.invoke(function (Nittro) {

    var ajax = new Nittro.Ajax.Service(),
        transitions = new Nittro.Page.Transitions(300),
        flashes = null;

    ajax.addTransport(new Nittro.Ajax.Transport.Native());

    var page = new Nittro.Page.Service(ajax, transitions, {
        whitelistLinks: false,
        defaultTransition: '.transition-auto'
    });

    if (Nittro.Extras && Nittro.Extras.Flashes) {
        flashes = new Nittro.Extras.Flashes.Service({ layer: document.body });

        page.on('flash', function(evt) {
            evt.preventDefault();
            flashes.add(null, evt.data.type, evt.data.message);
        });
    }

    _context.register(page, 'page');
    _context.register(ajax, 'ajax');
    _context.register(flashes, 'flashes');

});
