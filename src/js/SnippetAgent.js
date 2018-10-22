_context.invoke('Nittro.Page', function() {

    var SnippetAgent = _context.extend(function(page, snippetManager) {
        this._ = {
            page: page,
            snippetManager: snippetManager
        };

        this._.page.on('transaction-created', this._initTransaction.bind(this));
    }, {
        _initTransaction: function(evt) {
            var data = {
                removeTargets: 'remove' in evt.data.context
                    ? evt.data.context.remove || []
                    : (evt.data.context.element ? this._.snippetManager.getRemoveTargets(evt.data.context.element) : [])
            };

            evt.data.transaction.on('ajax-response', this._handleResponse.bind(this, data));
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
            return Promise.resolve().then(this._doApplyChangeset.bind(this, transaction, changeset));
        },

        _doApplyChangeset: function (transaction, changeset) {
            return transaction.trigger('snippets-apply', { changeset: changeset })
                .then(function() {
                    this._.snippetManager.applyChanges(changeset)
                }.bind(this));
        }
    });

    _context.register(SnippetAgent, 'SnippetAgent');

});
