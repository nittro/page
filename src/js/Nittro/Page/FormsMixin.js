_context.invoke('Nittro.Page', function(Nittro, Service, DOM) {

    if (!Nittro.Forms) {
        return;
    }

    var FormsMixin = {
        STATIC: {
            defaults: {
                whitelistForms: false
            }
        },

        initForms: function (formLocator) {
            this._.formLocator = formLocator;

            DOM.addListener(document, 'submit', this._handleSubmit.bind(this));
            DOM.addListener(document, 'click', this._handleButtonClick.bind(this));
            this._.snippetManager.on('cleanup', this._handleCleanup.bind(this));

        },

        sendForm: function (form, evt) {
            var frm = this._.formLocator.getForm(form);

            return this.open(form.action, form.method, frm.serialize(), {
                    event: evt,
                    element: form,
                    history: !!DOM.getData(form, 'history', true)
                })
                .then(function () {
                    frm.reset();

                });
        },

        _handleSubmit: function (evt) {
            if (evt.defaultPrevented || !(evt.target instanceof HTMLFormElement) || !this._checkForm(evt.target) || !this._checkUrl(evt.target.action)) {
                return;

            }

            this.sendForm(evt.target, evt);

        },

        _handleButtonClick: function (evt) {
            if (evt.defaultPrevented || evt.ctrlKey || evt.shiftKey || evt.altKey || evt.metaKey || evt.button > 0) {
                return;

            }

            var btn = DOM.closest(evt.target, 'button') || DOM.closest(evt.target, 'input'),
                frm;

            if (!btn || btn.type !== 'submit' || !btn.form || !this._checkForm(btn.form)) {
                return;

            }

            frm = this._.formLocator.getForm(btn.form);
            frm.setSubmittedBy(btn.name || null);

        },

        _checkForm: function (form) {
            return this._.options.whitelistForms ? DOM.hasClass(form, 'ajax') : !DOM.hasClass(form, 'noajax');

        },

        _handleCleanup: function(evt) {
            if (evt.data.element.tagName.toLowerCase() === 'form') {
                this._.formLocator.removeForm(evt.data.element);

            } else {
                var forms = evt.data.element.getElementsByTagName('form'),
                    i;

                for (i = 0; i < forms.length; i++) {
                    this._.formLocator.removeForm(forms.item(i));

                }
            }
        }
    };

    _context.register(FormsMixin, 'FormsMixin');
    _context.mixin(Service, FormsMixin);

}, {
    DOM: 'Utils.DOM'
});
