_context.invoke('Nittro.Page.Bridges.PageFlashes', function () {

    var FlashAgent = _context.extend(function(flashes) {
        this._ = {
            flashes: flashes
        };
    }, {
        init: function (transaction, context) {

        },

        dispatch: function (transaction, data) {

        },

        abort: function (transaction, data) {

        },

        handleAction: function (transaction, agent, action, actionData, data) {
            if (agent === 'ajax' && action === 'response') {
                var payload = actionData.getPayload();

                if (!payload.redirect && payload.flashes) {
                    this._showFlashes(payload.flashes);
                }
            }
        },

        _showFlashes: function (flashes) {
            var id, i;

            for (id in flashes) {
                if (flashes.hasOwnProperty(id) && flashes[id]) {
                    for (i = 0; i < flashes[id].length; i++) {
                        this._.flashes.add(flashes[id][i].message, flashes[id][i].type, id + '-messages');

                    }
                }
            }
        }
    });

    _context.register(FlashAgent, 'FlashAgent');

});
