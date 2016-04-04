describe('Nittro.Page.Service', function () {

    var Page, Transitions, Ajax, MockRequest, FlashMessages,
        mockAjax,
        mockFlashes,
        testInstance,
        testContainer;

    beforeAll(function () {
        Page = _context.lookup('Nittro.Page.Service');
        Transitions = _context.lookup('Nittro.Page.Transitions');
        Ajax = _context.lookup('Mocks.Ajax.Service');
        MockRequest = _context.lookup('Mocks.Ajax.Request');
        FlashMessages = _context.lookup('Mocks.Widgets.FlashMessages');

        mockAjax = new Ajax();
        mockFlashes = new FlashMessages();
        testInstance = new Page(mockAjax, new Transitions(200), mockFlashes);

        testContainer = document.createElement('div');
        document.body.appendChild(testContainer);

        testContainer.innerHTML = '<div id="snippet-test" class="transition-fade transition-auto"><h2>Test snippet</h2></div>';

    });

    afterAll(function () {
        document.body.removeChild(testContainer);
        testContainer = null;
    });



    describe('open()', function () {
        it('should load an URL', function (done) {
            var payload = {
                snippets: {
                    'snippet-test': '<h2>Response loaded</h2><a href="/bar" id="test-link" class="ajax" data-transition="#snippet-test">Test link</a>'
                }
            };
            mockAjax.requests.push(new MockRequest('/foo', 'GET', {}, { payload: payload }));

            testInstance.open('/foo').then(function () {
                expect(testContainer.querySelector('#snippet-test > h2').textContent).toBe('Response loaded');
                done();
            }, function () {
                done.fail('Response wasn\'t loaded');
            });
        });
    });

    describe('openLink()', function () {
        it('should open a link, performing any associated transitions', function (done) {
            var payload = {
                snippets: {
                    'snippet-test': '<h2>Another one bites the dust</h2>'
                }
            };

            mockAjax.requests.push(new MockRequest('/bar', 'GET', {}, { payload: payload }));

            testInstance.openLink(document.getElementById('test-link'))
                .then(function () {
                    if (parseFloat(window.getComputedStyle(testContainer.firstChild).opacity) === 1) {
                        done.fail('Transition wasn\'t applied');
                        return;
                    }

                    expect(testContainer.querySelector('#snippet-test > h2').textContent).toBe('Another one bites the dust');
                    done();

                }, function () {
                    done.fail('Response wasn\'t loaded');
                });

        });
    });

    describe('dynamic snippets', function () {
        it('should be appended by default', function (done) {
            testContainer.innerHTML = '<div id="snippet-test-dynamic" class="snippet-container" data-dynamic-mask="snippet-dynamic-\\d+"></div>';

            var payload = {
                snippets: {
                    'snippet-dynamic-1': 'Dynamic #1',
                    'snippet-dynamic-2': 'Dynamic #2',
                    'snippet-dynamic-3': 'Dynamic #3'
                }
            };

            mockAjax.requests.push(new MockRequest('/dynamic', 'GET', {}, { payload: payload }));

            testInstance.open('/dynamic').then(function () {
                expect(testContainer.querySelectorAll('#snippet-test-dynamic > div').length).toBe(3);
                done();
            }, function () {
                done.fail('Response wasn\'t loaded');
            });
        });
    });

});

