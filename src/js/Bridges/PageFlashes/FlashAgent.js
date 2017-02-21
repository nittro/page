_context.invoke('Nittro.Page.Bridges.PageFlashes', function () {

    var FlashAgent = _context.extend(function(flashes) {
        this._ = {
            flashes: flashes
        };

        this._handleResponse = this._handleResponse.bind(this);
    }, {
        initTransaction: function (transaction) {
            transaction.on('ajax-response', this._handleResponse);
        },

        _handleResponse: function (evt) {
            var payload = evt.data.response.getPayload();

            if (!payload.redirect && payload.flashes) {
                this._showFlashes(payload.flashes);
            }
        },

        _showFlashes: function (flashes) {
            var id, i;

            for (id in flashes) {
                if (flashes.hasOwnProperty(id) && flashes[id]) {
                    for (i = 0; i < flashes[id].length; i++) {
                        this._.flashes.add(flashes[id][i].message, flashes[id][i].type, id + 'es');

                    }
                }
            }
        }
    });

    _context.register(FlashAgent, 'FlashAgent');

});
