_context.invoke(function (Nittro) {

    var ajax = new Nittro.Ajax.Service(),
        ajaxAgent = new Nittro.Page.AjaxAgent(ajax),
        snippetManager = new Nittro.Page.SnippetManager(),
        snippetAgent = new Nittro.Page.SnippetAgent(snippetManager),
        historyAgent = new Nittro.Page.HistoryAgent(),
        transitionAgent = new Nittro.Page.TransitionAgent(),
        flashes = new Nittro.Extras.Flashes.Service(),
        flashAgent = new Nittro.Page.Bridges.PageFlashes.FlashAgent(flashes);

    ajax.addTransport(new Nittro.Ajax.Transport.Native());

    var page = new Nittro.Page.Service(ajaxAgent, snippetAgent, historyAgent, snippetManager);

    page.on('transaction-created', function(evt) {
        evt.data.transaction.add('flashes', flashAgent);
        evt.data.transaction.add('transitions', transitionAgent);
    });

    _context.register(page, 'page');
    _context.register(ajax, 'ajax');

});
