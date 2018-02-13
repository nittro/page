_context.invoke('Nittro.Page', function () {

    var CspAgent = _context.extend(function(page, nonce) {
        this._ = {
            page: page,
            nonce: nonce
        };

        this._.page.on('transaction-created', this._initTransaction.bind(this));
    }, {
        _initTransaction: function (evt) {
            var data = {
                nonce: null,
                pending: null
            };

            evt.data.transaction.on('ajax-response', this._handleResponse.bind(this, data));
            evt.data.transaction.on('snippets-apply', this._handleSnippets.bind(this, data));
        },

        _handleResponse: function (data, evt) {
            if ('redirect' in evt.data.response.getPayload()) {
                return;
            }

            var h = evt.data.response.getHeader('Content-Security-Policy') || evt.data.response.getHeader('Content-Security-Policy-Report-Only') || '',
                m = /(?:^|;\s*)script-src\s[^;]*'nonce-([^']+)'/.exec(h);

            if (m) {
                data.nonce = m[1];
            } else {
                data.nonce = false;
            }
        },

        _handleSnippets: function (data, evt) {
            this._handleChangeset(evt.data.changeset, data.nonce);
        },

        _handleChangeset: function (changeset, nonce) {
            if (!nonce) {
                return;
            }

            var id;

            for (id in changeset.add) {
                if (changeset.add.hasOwnProperty(id)) {
                    this._fixNonce(changeset.add[id].content, nonce);
                }
            }

            for (id in changeset.update) {
                if (changeset.update.hasOwnProperty(id)) {
                    this._fixNonce(changeset.update[id].content, nonce);
                }
            }
        },

        _fixNonce: function (elem, nonce) {
            var scripts = elem.getElementsByTagName('script'),
                i;

            for (i = 0; i < scripts.length; i++) {
                if (scripts.item(i).nonce === nonce) {
                    scripts.item(i).setAttribute('nonce', this._.nonce || '');
                }
            }
        }
    });

    _context.register(CspAgent, 'CspAgent');

});
