_context.invoke('Nittro.Page', function() {

    var SnippetAgent = _context.extend(function(snippetManager) {
        this._ = {
            snippetManager: snippetManager
        };
    }, {
        initTransaction: function(transaction, context) {
            var data = {
                removeTargets: context.element ? this._.snippetManager.getRemoveTargets(context.element) : []
            };

            transaction.on('ajax-response', this._handleResponse.bind(this, data));
        },

        _handleResponse: function(data, evt) {
            var payload = evt.data.response.getPayload(),
                changeset;

            if (payload.snippets || data.removeTargets.length) {
                changeset = this._.snippetManager.computeChanges(payload.snippets || {}, data.removeTargets);
                evt.waitFor(this._applyChangeset(evt.target, changeset));
            }
        },

        _applyChangeset: function (transaction, changeset) {
            return transaction.trigger('snippets-apply', { changeset: changeset })
                .then(function() {
                    this._.snippetManager.applyChanges(changeset);
                }.bind(this));
        }
    });

    _context.register(SnippetAgent, 'SnippetAgent');

});
