_context.invoke(function (Page, Ajax, FlashMessages) {

    var ajax = new Ajax.Service();
    ajax.addTransport(new Ajax.Transport.Native());

    var transitions = new Page.Transitions(300);
    var flashMessages = new FlashMessages({ layer: document.body });

    var page = new Page.Service(ajax, transitions, flashMessages, {
        whitelistLinks: false,
        defaultTransition: '.transition-slide, .transition-fade'
    });

    _context.register(page, 'page');

}, {
    Page: 'Nittro.Page',
    Ajax: 'Nittro.Ajax',
    FlashMessages: 'Nittro.Widgets.FlashMessages'
});
