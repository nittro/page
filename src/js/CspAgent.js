_context.invoke('Nittro.Page', function () {

    var CspAgent = _context.extend(function(nonce) {
        this._ = {
            nonce: nonce
        };
    }, {
        init: function (transaction, context) {
            return {
                nonce: null,
                pending: null
            };
        },

        dispatch: function (transaction, data) {

        },

        abort: function (transaction, data) {

        },

        handleAction: function (transaction, agent, action, actionData, data) {
            if (agent === 'ajax' && action === 'response') {
                var m = /(?:^|;\s*)script-src\s[^;]*'nonce-([^']+)'/.exec(actionData.getHeader('Content-Security-Policy') || actionData.getHeader('Content-Security-Policy-Report-Only') || '');

                if (m) {
                    data.nonce = m[1];
                } else {
                    data.nonce = false;
                }

                if (data.pending) {
                    data.pending();
                }
            } else if (agent === 'snippets' && action === 'apply-changes') {
                if (data.nonce !== null) {
                    this._handleChangeset(actionData, data.nonce);
                } else {
                    return this._scheduleHandleChangeset(actionData, data);
                }
            }
        },

        _scheduleHandleChangeset: function (changeset, data) {
            return new Promise(function (fulfill) {
                data.pending = function () {
                    this._handleChangeset(changeset, data.nonce);
                    fulfill();
                }.bind(this);
            }.bind(this));
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
                if (scripts.item(i).getAttribute('nonce') === nonce) {
                    scripts.item(i).setAttribute('nonce', this._.nonce || '');
                }
            }
        }
    });

    _context.register(CspAgent, 'CspAgent');

});
