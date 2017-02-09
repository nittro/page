_context.invoke('Nittro.Page', function() {

    var SnippetAgent = _context.extend(function(snippetManager) {
        this._ = {
            snippetManager: snippetManager
        };
    }, {
        init: function(transaction, context) {
            return {
                removeTargets: context.element ? this._.snippetManager.getRemoveTargets(context.element) : []
            };
        },

        dispatch: function(transaction, data) {

        },

        abort: function(transaction, data) {
            // clean up remove targets
        },

        handleAction: function(transaction, agent, action, actionData, data) {
            if (agent === 'ajax' && action === 'response') {
                var payload = actionData.getPayload(),
                    changeset;

                if (payload.snippets || data.removeTargets.length) {
                    changeset = this._.snippetManager.computeChanges(payload.snippets || {}, data.removeTargets);

                    return transaction.dispatchAgentAction('snippets', 'apply-changes', changeset)
                        .then(function() {
                            this._.snippetManager.applyChanges(changeset);
                        }.bind(this));
                }
            }
        }
    });

    _context.register(SnippetAgent, 'SnippetAgent');

});
